import type { FastifyInstance } from "fastify";

import type { InventoryItemDTO } from "@casemove/shared-types";

import { steamManager } from "../../core/steam-manager";
import { supabaseAdmin } from "../../core/supabase";
import { getRefreshToken, saveRefreshToken } from "../steam-accounts/credentials";
import { mapSteamItemToDTO } from "../inventory/service";

export async function registerStorageRoutes(app: FastifyInstance) {
  // GET /storage/:id - Get items from a specific storage unit
  app.get<{ Params: { id: string } }>("/storage/:id", async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const storageId = request.params.id;

    try {
      // Resolve active account ID from DB
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
          // Lazy Auto-Reconnect (same logic as inventory)
          console.log("[Storage] No active client found, attempting lazy auto-reconnect...");

          const { data: account } = await supabaseAdmin
            .from("steam_accounts")
            .select("steam_login")
            .eq("id", steamAccountId)
            .single();

          if (account?.steam_login) {
            const refreshToken = await getRefreshToken(steamAccountId);

            if (refreshToken) {
              console.log(`[Storage] Found refresh token for ${account.steam_login}, connecting...`);
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

              await supabaseAdmin
                .from("steam_accounts")
                .update({ status: "connected", last_login_at: new Date().toISOString() })
                .eq("id", steamAccountId);

              console.log("[Storage] Auto-reconnect successful!");
            } else {
              console.warn("[Storage] No refresh token found for auto-reconnect");
            }
          }
        }
      } catch (err) {
        console.warn("[Storage] Auto-reconnect failed:", err);
      }

      if (!client) {
        return reply.code(400).send({ message: "Steam client not connected. Please reconnect." });
      }

      // Ensure item schema is loaded
      await client.loadItemSchema();

      // Fetch storage items
      const rawItems = await client.getStorageItems(storageId);

      // Map to DTOs using the same logic as inventory
      const items: InventoryItemDTO[] = rawItems.map((item) =>
        mapSteamItemToDTO(item, client)
      );

      return { items };
    } catch (error) {
      console.error("[Storage] Failed to load storage items:", error);
      return reply.code(500).send({ message: "Failed to load storage items" });
    }
  });
}
