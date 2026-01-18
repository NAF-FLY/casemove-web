import type { FastifyInstance } from "fastify";

import { steamManager } from "../../core/steam-manager";
import { supabaseAdmin } from "../../core/supabase";
import { getRefreshToken, saveRefreshToken } from "../steam-accounts/credentials";
import { getInventory } from "./service";

// Store last force refresh time per user to enforce 5-minute cooldown
const lastForceRefreshMap = new Map<string, number>();
const FORCE_REFRESH_COOLDOWN = 15 * 1000; // 5 minutes

export async function registerInventoryRoutes(app: FastifyInstance) {
  app.get("/inventory", async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const query = request.query as { forceRefresh?: string };
    const forceRefreshRequested = query.forceRefresh === "true";
    
    // Check force refresh cooldown
    let forceRefresh = false;
    if (forceRefreshRequested) {
      const lastRefresh = lastForceRefreshMap.get(request.user.userId) ?? 0;
      const timeSinceLastRefresh = Date.now() - lastRefresh;
      console.log(`[Inventory] Force refresh requested. Last refresh: ${lastRefresh}, Time since: ${timeSinceLastRefresh}ms, Cooldown: ${FORCE_REFRESH_COOLDOWN}ms`);
      if (timeSinceLastRefresh >= FORCE_REFRESH_COOLDOWN) {
        forceRefresh = true;
        lastForceRefreshMap.set(request.user.userId, Date.now());
        console.log(`[Inventory] Force refresh APPROVED`);
      } else {
        const remainingSeconds = Math.ceil((FORCE_REFRESH_COOLDOWN - timeSinceLastRefresh) / 1000);
        console.log(`[Inventory] Force refresh on cooldown, ${remainingSeconds}s remaining`);
      }
    }
    console.log(`[Inventory] Final forceRefresh value: ${forceRefresh}`);

    try {
      // Resolve active account ID from DB (robust against server restarts)
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("active_steam_account_id")
        .eq("user_id", request.user.userId)
        .single();
      
      const steamAccountId = profile?.active_steam_account_id;
      if (!steamAccountId) {
        return reply.code(400).send({ message: "No active Steam account selected" });
      }

      let client;
      try {
        // Try to get connected client (may fail if server restarted)
        if (steamManager.hasActiveClient(request.user.userId)) {
          client = steamManager.getActiveClient(request.user.userId);
        } else {
          // Lazy Auto-Reconnect
          console.log("No active client found, attempting lazy auto-reconnect...");
          
          // 1. Get account details
          const { data: account } = await supabaseAdmin
            .from("steam_accounts")
            .select("steam_login")
            .eq("id", steamAccountId)
            .single();

          if (account?.steam_login) {
            // 2. Get refresh token
            const refreshToken = await getRefreshToken(steamAccountId);
            
            if (refreshToken) {
               // 3. Connect
               console.log(`Found refresh token for ${account.steam_login}, connecting...`);
               client = await steamManager.connect(
                 request.user.userId,
                 steamAccountId,
                 {
                   username: account.steam_login,
                   refreshToken
                 },
                 async (token) => {
                   await saveRefreshToken(steamAccountId, token);
                 }
               );
               
               // Fix: persistent status not updating after auto-reconnect
               await supabaseAdmin
                 .from("steam_accounts")
                 .update({ status: "connected", last_login_at: new Date().toISOString() })
                 .eq("id", steamAccountId);

               console.log("Auto-reconnect successful!");
            } else {
               console.warn("No refresh token found for auto-reconnect");
            }
          }
        }
      } catch (err) {
        console.warn("Auto-reconnect failed:", err);
        // Client remains undefined, will rely on cache
      }

      const items = await getInventory(client, steamAccountId, forceRefresh);

      return { items };
    } catch (error) {
      console.error("Failed to load inventory", error);
      return reply.code(500).send({ message: "Failed to load inventory" });
    }
  });
}
