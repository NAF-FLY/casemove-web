import type { FastifyInstance } from "fastify";

import { supabaseAdmin } from "../../core/supabase";
import { steamManager } from "../../core/steam-manager";

type CreateAccountBody = {
  steamLogin: string;
  password: string;
  twoFactorCode?: string;
  proxySocks5?: string;
};

type ConnectBody = {
  password: string;
  twoFactorCode?: string;
};

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
            "id, steam_login, persona_name, status, proxy_socks5, last_login_at, created_at, updated_at"
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
        .select(
          "id, steam_login, persona_name, status, proxy_socks5, last_login_at, created_at, updated_at"
        )
        .single();

      if (insertError || !inserted) {
        return reply.code(500).send({ message: "Failed to add account" });
      }

      try {
        const client = await steamManager.connect(userId, inserted.id, {
          username: normalizedLogin,
          password: normalizedPassword,
          twoFactorCode
        });

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
          .select(
            "id, steam_login, persona_name, status, proxy_socks5, last_login_at, created_at, updated_at"
          )
          .single();

        await supabaseAdmin
          .from("user_profiles")
          .update({ active_steam_account_id: inserted.id })
          .eq("user_id", userId);

        steamManager.setActiveAccount(userId, inserted.id);

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

      if (!normalizedPassword) {
        return reply.code(400).send({ message: "Password is required." });
      }

      const { data: account } = await supabaseAdmin
        .from("steam_accounts")
        .select(
          "id, steam_login, persona_name, status, proxy_socks5, last_login_at, created_at, updated_at"
        )
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!account) {
        return reply.code(404).send({ message: "Account not found" });
      }

      try {
        const client = await steamManager.connect(userId, account.id, {
          username: account.steam_login,
          password: normalizedPassword,
          twoFactorCode
        });

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
          .select(
            "id, steam_login, persona_name, status, proxy_socks5, last_login_at, created_at, updated_at"
          )
          .single();

        await supabaseAdmin
          .from("user_profiles")
          .update({ active_steam_account_id: account.id })
          .eq("user_id", userId);

        steamManager.setActiveAccount(userId, account.id);

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
