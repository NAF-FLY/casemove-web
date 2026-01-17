import type { FastifyInstance } from "fastify";

import { supabaseAdmin } from "../../core/supabase";
import { steamManager } from "../../core/steam-manager";
import type { ISteamClient } from "../../core/steam-client";
import { saveRefreshToken, getRefreshToken } from "./credentials";

type CreateAccountBody = {
  steamLogin: string;
  password: string;
  twoFactorCode?: string;
  proxySocks5?: string;
};

type ConnectBody = {
  password?: string;
  twoFactorCode?: string;
};

// Fields to select when returning steam account data
const ACCOUNT_SELECT_FIELDS = "id, steam_login, persona_name, steam_id, avatar_url, profile_url, trade_url, account_created_at, profile_updated_at, status, proxy_socks5, last_login_at, created_at, updated_at";

// Profile data cache duration (7 days in milliseconds)
const PROFILE_CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Checks if profile data needs to be refreshed.
 * Returns true if profile data is missing or older than 7 days.
 */
function shouldRefreshProfileData(account: {
  steam_id: string | null;
  avatar_url: string | null;
  profile_updated_at: string | null;
}): boolean {
  console.log("[Profile] Checking if refresh needed for account:", account.steam_id, {
    hasAvatar: !!account.avatar_url,
    updatedAt: account.profile_updated_at
  });

  // If essential data is missing, refresh
  if (!account.steam_id) {
    console.log("[Profile] Refresh needed: missing steam_id");
    return true;
  }
  
  // If never updated, refresh
  if (!account.profile_updated_at) {
    console.log("[Profile] Refresh needed: never updated");
    return true;
  }
  
  // Check if data is older than cache duration
  const lastUpdate = new Date(account.profile_updated_at).getTime();
  const now = Date.now();
  const age = now - lastUpdate;
  
  if (age > PROFILE_CACHE_DURATION_MS) {
    console.log(`[Profile] Refresh needed: data is stale (${Math.round(age / 1000 / 60 / 60)}h old)`);
    return true;
  }
  
  console.log(`[Profile] Skip refresh: data is fresh (${Math.round(age / 1000 / 60 / 60)}h old)`);
  return false;
}

/**
 * Fetches profile data from Steam client and saves it to database.
 * Only fetches if data is missing or older than 7 days.
 */
async function fetchAndSaveProfileData(
  client: ISteamClient,
  accountId: string,
  userId: string,
  existingAccount?: { steam_id: string | null; avatar_url: string | null; profile_updated_at: string | null }
): Promise<void> {
  // Check if we need to refresh
  if (existingAccount && !shouldRefreshProfileData(existingAccount)) {
    return;
  }

  // Wait a bit for web session to be ready
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  try {
    const profileData = await client.getProfileData();
    if (!profileData) {
      console.warn("[Profile] Could not get profile data for account", accountId);
      return;
    }

    console.log("[Profile] Got profile data:", profileData);

    // Only update fields that are present to avoid overwriting with nulls
    // (e.g. if miniprofile fetch failed but we have data in DB)
    const updatePayload: Record<string, any> = {
      steam_id: profileData.steamId,
      profile_updated_at: new Date().toISOString()
    };

    if (profileData.avatarUrl) updatePayload.avatar_url = profileData.avatarUrl;
    if (profileData.profileUrl) updatePayload.profile_url = profileData.profileUrl;
    if (profileData.tradeUrl) updatePayload.trade_url = profileData.tradeUrl;
    if (profileData.accountCreatedAt) updatePayload.account_created_at = profileData.accountCreatedAt.toISOString();

    console.log("[Profile] Saving update updatePayload:", updatePayload);

    await supabaseAdmin
      .from("steam_accounts")
      .update(updatePayload)
      .eq("id", accountId)
      .eq("user_id", userId);
  } catch (err) {
    console.warn("Failed to fetch/save profile data:", err);
  }
}

export async function registerSteamAccountsRoutes(app: FastifyInstance) {
  app.get("/steam-accounts", async (request, reply) => {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const [{ data: accounts, error: accountsError }, { data: profile }] =
      await Promise.all([
        supabaseAdmin
          .from("steam_accounts")
          .select(
            "id, steam_login, persona_name, steam_id, avatar_url, profile_url, trade_url, account_created_at, status, proxy_socks5, last_login_at, created_at, updated_at"
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("user_profiles")
          .select("active_steam_account_id")
          .eq("user_id", userId)
          .maybeSingle()
      ]);

    if (accountsError) {
      return reply.code(500).send({ message: "Failed to load accounts" });
    }

    return {
      accounts: accounts ?? [],
      activeSteamAccountId: profile?.active_steam_account_id ?? null
    };
  });

  app.post<{ Body: CreateAccountBody }>(
    "/steam-accounts",
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const { steamLogin, password, twoFactorCode, proxySocks5 } = request.body;
      const normalizedLogin = steamLogin?.trim();
      const normalizedPassword = password?.trim();

      if (!normalizedLogin || !normalizedPassword) {
        return reply
          .code(400)
          .send({ message: "Steam login and password are required." });
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("steam_accounts")
        .insert({
          user_id: userId,
          steam_login: normalizedLogin,
          proxy_socks5: proxySocks5 ?? null,
          status: "pending"
        })
        .select(ACCOUNT_SELECT_FIELDS)
        .single();

      if (insertError || !inserted) {
        // Check for unique constraint violation
        if (insertError?.code === "23505") {
          return reply
            .code(409)
            .send({ message: "This Steam account is already added." });
        }
        console.error("Failed to insert steam account:", insertError);
        return reply.code(500).send({ message: "Failed to add account" });
      }

      try {
        const client = await steamManager.connect(
          userId,
          inserted.id,
          {
            username: normalizedLogin,
            password: normalizedPassword,
            twoFactorCode
          },
          // Save refresh token when received (callback set before login)
          async (token) => {
            await saveRefreshToken(inserted.id, token);
          }
        );

        const personaName = client.getPersonaName();
        const nowIso = new Date().toISOString();

        const { data: updated } = await supabaseAdmin
          .from("steam_accounts")
          .update({
            persona_name: personaName,
            status: "connected",
            last_login_at: nowIso
          })
          .eq("id", inserted.id)
          .eq("user_id", userId)
          .select(ACCOUNT_SELECT_FIELDS)
          .single();

        await supabaseAdmin
          .from("user_profiles")
          .update({ active_steam_account_id: inserted.id })
          .eq("user_id", userId);

        steamManager.setActiveAccount(userId, inserted.id);

        // Fetch and save profile data in background (don't block response)
        void fetchAndSaveProfileData(client, inserted.id, userId);

        return {
          account: updated ?? inserted
        };
      } catch (error) {
        await supabaseAdmin
          .from("steam_accounts")
          .update({ status: "error" })
          .eq("id", inserted.id)
          .eq("user_id", userId);

        const message =
          error instanceof Error &&
          (error.message === "Steam Guard required" ||
            error.message === "Steam Guard code incorrect")
            ? error.message
            : error instanceof Error && error.message
              ? error.message
              : "Steam login failed";

        return reply.code(401).send({ message });
      }
    }
  );

  app.post<{ Params: { id: string }; Body: ConnectBody }>(
    "/steam-accounts/:id/connect",
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const { id } = request.params;
      const { password, twoFactorCode } = request.body;
      const normalizedPassword = password?.trim();

      const { data: account } = await supabaseAdmin
        .from("steam_accounts")
        .select(ACCOUNT_SELECT_FIELDS)
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!account) {
        return reply.code(404).send({ message: "Account not found" });
      }

      // Try to use saved refresh token first
      const savedToken = await getRefreshToken(account.id);
      if (savedToken) {
        try {
          console.log(`Attempting token-based reconnect for account ${account.id}`);
          const client = await steamManager.connect(
            userId,
            account.id,
            {
              username: account.steam_login,
              refreshToken: savedToken
            },
            async (token) => {
              await saveRefreshToken(account.id, token);
            }
          );

          const personaName = client.getPersonaName();
          const nowIso = new Date().toISOString();

          const { data: updated } = await supabaseAdmin
            .from("steam_accounts")
            .update({
              persona_name: personaName,
              status: "connected",
              last_login_at: nowIso
            })
            .eq("id", account.id)
            .eq("user_id", userId)
            .select(ACCOUNT_SELECT_FIELDS)
            .single();

          await supabaseAdmin
            .from("user_profiles")
            .update({ active_steam_account_id: account.id })
            .eq("user_id", userId);

          steamManager.setActiveAccount(userId, account.id);

          // Fetch and save profile data in background (only if stale)
          void fetchAndSaveProfileData(client, account.id, userId, account);

          return { account: updated ?? account };
        } catch (tokenError) {
          console.warn(`Token-based reconnect failed for account ${account.id}:`, tokenError);
          // Token expired or invalid, fall through to password-based login
        }
      }

      // Password-based login (fallback or no token available)
      if (!normalizedPassword) {
        return reply.code(401).send({ 
          message: "Session expired. Password required.",
          requiresPassword: true
        });
      }

      try {
        const client = await steamManager.connect(
          userId,
          account.id,
          {
            username: account.steam_login,
            password: normalizedPassword,
            twoFactorCode
          },
          async (token) => {
            await saveRefreshToken(account.id, token);
          }
        );

        const personaName = client.getPersonaName();
        const nowIso = new Date().toISOString();

        const { data: updated } = await supabaseAdmin
          .from("steam_accounts")
          .update({
            persona_name: personaName,
            status: "connected",
            last_login_at: nowIso
          })
          .eq("id", account.id)
          .eq("user_id", userId)
          .select(ACCOUNT_SELECT_FIELDS)
          .single();

        await supabaseAdmin
          .from("user_profiles")
          .update({ active_steam_account_id: account.id })
          .eq("user_id", userId);

        steamManager.setActiveAccount(userId, account.id);

        // Fetch and save profile data in background (only if stale)
        void fetchAndSaveProfileData(client, account.id, userId, account);

        return { account: updated ?? account };
      } catch (error) {
        await supabaseAdmin
          .from("steam_accounts")
          .update({ status: "error" })
          .eq("id", account.id)
          .eq("user_id", userId);

        const message =
          error instanceof Error &&
          (error.message === "Steam Guard required" ||
            error.message === "Steam Guard code incorrect")
            ? error.message
            : error instanceof Error && error.message
              ? error.message
              : "Steam login failed";

        return reply.code(401).send({ message });
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    "/steam-accounts/:id/disconnect",
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const { id } = request.params;
      steamManager.disconnect(userId, id);

      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("active_steam_account_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile?.active_steam_account_id === id) {
        await supabaseAdmin
          .from("user_profiles")
          .update({ active_steam_account_id: null })
          .eq("user_id", userId);
      }

      await supabaseAdmin
        .from("steam_accounts")
        .update({ status: "idle" })
        .eq("id", id)
        .eq("user_id", userId);

      return { ok: true };
    }
  );

  app.post<{ Params: { id: string } }>(
    "/steam-accounts/:id/switch",
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const { id } = request.params;

      if (!steamManager.hasClient(userId, id)) {
        return reply.code(409).send({ message: "Steam account not connected" });
      }

      steamManager.setActiveAccount(userId, id);
      await supabaseAdmin
        .from("user_profiles")
        .update({ active_steam_account_id: id })
        .eq("user_id", userId);

      return { ok: true };
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/steam-accounts/:id",
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const { id } = request.params;
      steamManager.disconnect(userId, id);

      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("active_steam_account_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile?.active_steam_account_id === id) {
        await supabaseAdmin
          .from("user_profiles")
          .update({ active_steam_account_id: null })
          .eq("user_id", userId);
      }

      const { error } = await supabaseAdmin
        .from("steam_accounts")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        return reply.code(500).send({ message: "Failed to delete account" });
      }

      return { ok: true };
    }
  );

  app.post<{ Params: { id: string } }>(
    "/steam-accounts/:id/revoke",
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const { id } = request.params;

      const { data: account } = await supabaseAdmin
        .from("steam_accounts")
        .select("id")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!account) {
        return reply.code(404).send({ message: "Account not found" });
      }

      await supabaseAdmin
        .from("steam_credentials")
        .update({ revoked_at: new Date().toISOString() })
        .eq("steam_account_id", id);

      return { ok: true };
    }
  );
}
