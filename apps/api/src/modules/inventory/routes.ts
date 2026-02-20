import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { supabaseAdmin } from "../../core/supabase";
import { getInventory, takeInventorySnapshot } from "./service";
import { ensureAuthenticatedClient } from "../steam-accounts/connection.utils";

// Store last force refresh time per user to enforce 5-minute cooldown
const lastForceRefreshMap = new Map<string, number>();
const FORCE_REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 minutes

export const registerInventoryRoutes = fp(async function (app: FastifyInstance) {
  app.get("/inventory", async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const query = request.query as {
      forceRefresh?: string;
      cacheTtlMs?: string;
    };
    const forceRefreshRequested = query.forceRefresh === "true";
    const cacheTtlMs = query.cacheTtlMs ? Number(query.cacheTtlMs) : undefined;
    const normalizedCacheTtlMs =
      Number.isFinite(cacheTtlMs) && cacheTtlMs && cacheTtlMs > 0
        ? cacheTtlMs
        : undefined;
    
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
      const { client, steamAccountId } = await ensureAuthenticatedClient(request.user.userId, "[Inventory]");
      const items = await getInventory(
        client,
        steamAccountId,
        forceRefresh,
        normalizedCacheTtlMs
      );

      return { items };
    } catch (error) {
      console.error("Failed to load inventory", error);
      // Determine if it is a user error (e.g. no account) or server error
      const message = error instanceof Error ? error.message : "Failed to load inventory";
      if (message.includes("No active Steam account") || message.includes("Steam account not found")) {
        return reply.code(400).send({ message });
      }
      return reply.code(500).send({ message: "Failed to load inventory" });
    }
  });

  app.get("/inventory/stats", async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const query = request.query as {
      steamAccountId: string;
      storageId?: string;
    };

    const { steamAccountId, storageId } = query;

    if (!steamAccountId) {
      return reply.code(400).send({ message: "steamAccountId is required" });
    }

    try {
      // 1. Ensure user has access to this steam account
      const { data: account, error: accountError } = await supabaseAdmin
        .from("steam_accounts")
        .select("id")
        .eq("id", steamAccountId)
        .eq("user_id", request.user.userId)
        .single();

      if (accountError || !account) {
        return reply.code(403).send({ message: "Forbidden or account not found" });
      }

      // 2. Fetch stats
      let dbQuery = supabaseAdmin
        .from("inventory_snapshots")
        .select("*")
        .eq("steam_account_id", steamAccountId)
        .order("created_at", { ascending: true }); // Chronological order for charts

      if (storageId) {
        dbQuery = dbQuery.eq("storage_id", storageId);
      } else {
        dbQuery = dbQuery.is("storage_id", null); // is null
      }

      const { data: stats, error } = await dbQuery;

      if (error) {
        console.error("[InventoryStats] Error fetching stats:", error);
        return reply.code(500).send({ message: "Failed to fetch inventory stats" });
      }

      return { stats };
    } catch (error) {
       console.error("[InventoryStats] Error:", error);
       return reply.code(500).send({ message: "Internal server error" });
    }
  });

  app.post("/inventory/stats/trigger", async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const { steamAccountId } = request.body as { steamAccountId: string };

    if (!steamAccountId) {
      return reply.code(400).send({ message: "steamAccountId is required" });
    }

    try {
      // 1. Ensure user has access to this steam account
      const { data: account, error: accountError } = await supabaseAdmin
        .from("steam_accounts")
        .select("id")
        .eq("id", steamAccountId)
        .eq("user_id", request.user.userId)
        .single();

      if (accountError || !account) {
        return reply.code(403).send({ message: "Forbidden or account not found" });
      }

      // 2. Trigger snapshot
      console.log(`[InventoryStats] Manual snapshot triggered for account: ${steamAccountId}`);
      await takeInventorySnapshot(steamAccountId);

      return { success: true, message: "Snapshot triggered successfully" };
    } catch (error) {
       console.error("[InventoryStats] Error triggering manual snapshot:", error);
       return reply.code(500).send({ message: "Internal server error" });
    }
  });
});
