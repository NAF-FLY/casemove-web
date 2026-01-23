import type { FastifyRequest } from "fastify";
import { steamManager } from "../../core/steam-manager";
import { supabaseAdmin } from "../../core/supabase";
import { getRefreshToken, saveRefreshToken } from "./credentials";
import type { ISteamClient } from "../../core/steam-client";

/**
 * Ensures a Steam client is connected for the active account of the user.
 * Handles lazy auto-reconnection using refresh tokens if no active client exists.
 */
export async function ensureAuthenticatedClient(
  userId: string,
  logPrefix = "[SteamConnection]"
): Promise<{ client: ISteamClient; steamAccountId: string }> {
  
  // 1. Resolve active account ID
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("active_steam_account_id")
    .eq("user_id", userId)
    .single();

  const steamAccountId = profile?.active_steam_account_id;
  if (!steamAccountId) {
    throw new Error("No active Steam account selected");
  }

  // 2. Check if already connected
  if (steamManager.hasActiveClient(userId)) {
    return { 
      client: steamManager.getActiveClient(userId),
      steamAccountId 
    };
  }

  // 3. Lazy Auto-Reconnect
  console.log(`${logPrefix} No active client found, attempting lazy auto-reconnect...`);

  const { data: account } = await supabaseAdmin
    .from("steam_accounts")
    .select("steam_login")
    .eq("id", steamAccountId)
    .single();

  if (!account?.steam_login) {
    throw new Error("Steam account not found or invalid");
  }

  const refreshToken = await getRefreshToken(steamAccountId);
  if (!refreshToken) {
    throw new Error("No refresh token found for auto-reconnect");
  }

  console.log(`${logPrefix} Found refresh token for ${account.steam_login}, connecting...`);
  
  const client = await steamManager.connect(
    userId,
    steamAccountId,
    {
      username: account.steam_login,
      refreshToken
    },
    async (token) => {
      await saveRefreshToken(steamAccountId, token);
    }
  );

  // Update status
  await supabaseAdmin
    .from("steam_accounts")
    .update({ status: "connected", last_login_at: new Date().toISOString() })
    .eq("id", steamAccountId);

  console.log(`${logPrefix} Auto-reconnect successful!`);
  
  return { client, steamAccountId };
}
