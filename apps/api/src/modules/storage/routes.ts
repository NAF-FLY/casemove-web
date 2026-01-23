import type { FastifyInstance } from "fastify";

import type { InventoryItemDTO } from "@casemove/shared-types";

import { supabaseAdmin } from "../../core/supabase";
import { getInventory, invalidateInventoryCache, mapSteamItemToDTO } from "../inventory/service";
import { priceService } from "../inventory/price.service";
import { ensureAuthenticatedClient } from "../steam-accounts/connection.utils";

// Cache config
const STORAGE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const FORCE_REFRESH_COOLDOWN = 2 * 60 * 1000; // 2 minutes

type DepositItemResult = {
  itemId: string;
  status: "ok" | "error";
  reason?: string;
};

function isStorageUnit(item: InventoryItemDTO | null | undefined) {
  if (!item) return false;
  return (
    item.marketHashName.startsWith("Storage Unit") ||
    item.schema?.name?.startsWith("Storage Unit")
  );
}

export async function registerStorageRoutes(app: FastifyInstance) {
  // GET /storage/:id - Get items from a specific storage unit
  app.get<{ Params: { id: string }, Querystring: { forceRefresh?: string } }>("/storage/:id", async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const storageId = request.params.id;
    const forceRefreshRequested = request.query.forceRefresh === "true";

    try {
      const { client, steamAccountId } = await ensureAuthenticatedClient(request.user.userId, "[Storage]");
      
      // 1. Check database cache first
      let cachedData: any = null;
      try {
        const { data } = await supabaseAdmin
          .from("steam_storage_cache")
          .select("*")
          .eq("steam_account_id", steamAccountId)
          .eq("storage_id", storageId)
          .single();
        cachedData = data;
      } catch (err) {
        console.warn("[Storage] Failed to check cache:", err);
      }

      const now = Date.now();
      let shouldFetchFromSteam = true;
      
      // Logic:
      // If we have cache:
      //   If forceRefresh is TRUE:
      //     Check Cooldown (2 mins). If on cooldown -> Return Cache (with warning?) or Error? 
      //     Let's return cache with a header/flag if possible, or just error if really strict.
      //     User said: "ограничие на ручной рефреш 2 минуты" -> Assuming blocking or ignoring.
      //     Let's block with 429 if explicitly requested, OR fall back to cache.
      //     Implementation: Throw error if on cooldown and force requested.
      //   If forceRefresh is FALSE:
      //     Check Age (24 hours). 
      //     If Age < 24h -> Return Cache.
      //     If Age > 24h -> Fetch from Steam (Auto-refresh).
      
      if (cachedData) {
        const lastUpdated = new Date(cachedData.updated_at).getTime();
        const age = now - lastUpdated;
        
        if (forceRefreshRequested) {
          if (age < FORCE_REFRESH_COOLDOWN) {
            // On cooldown
            const remaining = Math.ceil((FORCE_REFRESH_COOLDOWN - age) / 1000);
            return reply.code(429).send({ 
              message: `Please wait ${remaining} seconds before refreshing again.`,
              items: cachedData.items,
              totalValue: cachedData.total_value,
              totalItems: cachedData.total_items,
              updatedAt: cachedData.updated_at,
              fromCache: true
            });
          }
          // Allowed to refresh
          shouldFetchFromSteam = true;
          console.log(`[Storage] Force refresh allowed for ${storageId}`);
        } else {
          // Auto-refresh logic
          if (age < STORAGE_CACHE_DURATION) {
             console.log(`[Storage] serving from cache (age: ${Math.round(age/1000/60)}m)`);
             shouldFetchFromSteam = false;
          } else {
             console.log(`[Storage] Cache expired (age: ${Math.round(age/1000/60)}m), auto-refreshing`);
             shouldFetchFromSteam = true;
          }
        }
      } else {
        // No cache, must fetch
        shouldFetchFromSteam = true;
      }

      // If we can serve from cache and decided to do so
      if (!shouldFetchFromSteam && cachedData) {
        return { 
          items: cachedData.items, 
          totalValue: cachedData.total_value, 
          totalItems: cachedData.total_items,
          updatedAt: cachedData.updated_at,
          fromCache: true
        };
      }

      // 2. Fetch from Steam
      await client.loadItemSchema();
      console.log(`[Storage] Fetching contents for ${storageId} from Steam GC...`);
      
      const rawItems = await client.getStorageItems(storageId);

      // Fetch parent inventory cache early to validate response
      let parentStorageItem: InventoryItemDTO | null = null;
      let parentCacheItems: InventoryItemDTO[] | null = null;
      
      try {
        const { data: cache } = await supabaseAdmin
          .from("steam_inventory_cache")
          .select("items")
          .eq("steam_account_id", steamAccountId)
          .single();
          
        if (cache?.items && Array.isArray(cache.items)) {
           parentCacheItems = cache.items as InventoryItemDTO[];
           const found = parentCacheItems.find((i) => i.id === storageId);
           if (found) parentStorageItem = found;
        }
      } catch (err) {
        console.warn("[Storage] Failed to check parent inventory:", err);
      }

      // Check for suspicious empty response 
      const expectedItemsCount = cachedData?.total_items || parentStorageItem?.storageItemsCount || 0;
      
      if (rawItems.length === 0 && expectedItemsCount > 0) {
        console.warn(`[Storage] Steam returned 0 items but expected ${expectedItemsCount} (Cache: ${cachedData?.total_items}, Parent: ${parentStorageItem?.storageItemsCount}).`);
        
        if (cachedData && cachedData.total_items > 0) {
             console.log(`[Storage] Serving fallback from cache.`);
             return { 
               items: cachedData.items, 
               totalValue: cachedData.total_value, 
               totalItems: cachedData.total_items,
               updatedAt: cachedData.updated_at,
               fromCache: true,
               message: "Steam servers are experiencing issues. Showing cached data."
             };
        } else {
             // We have no cache to serve, but we KNOW it shouldn't be empty.
             // Throwing error prevents overwriting cache with empty list.
             throw new Error("Steam returned 0 items but storage is known to be non-empty. Please try again.");
        }
      }

      // Map to DTOs using the same logic as inventory
      const items: InventoryItemDTO[] = rawItems.map((item) =>
        mapSteamItemToDTO(item, client)
      );

      // Populate prices
      const marketHashNames = items
        .map((d) => d.marketHashName)
        .filter((n): n is string => !!n);
      
      const uniqueNames = Array.from(new Set(marketHashNames));
      const priceMap = await priceService.getPrices(uniqueNames);

      let totalStorageValue = 0;

      for (const dto of items) {
        if (dto.marketHashName) {
          const price = priceMap.get(dto.marketHashName);
          if (typeof price === 'number') {
            dto.price = price;
            dto.priceCurrency = 'USD';
            totalStorageValue += price;
          }
        }
      }

      const totalItemsCount = items.length;
      const updatedAt = new Date().toISOString();

      // 3. Update storage value in main inventory cache
      if (parentCacheItems && parentStorageItem) {
          const currentItem = parentStorageItem;
           if (currentItem.storagePrice !== totalStorageValue || currentItem.storageItemsCount !== totalItemsCount) {
             console.log(`[Storage] Updating parent inventory item ${storageId}: value $${totalStorageValue}, items ${totalItemsCount}`);
             currentItem.storagePrice = totalStorageValue;
             currentItem.storageItemsCount = totalItemsCount;
             
             // Find index to update in the array we already fetched
             const index = parentCacheItems.findIndex(i => i.id === storageId);
             if (index !== -1) {
                 parentCacheItems[index] = currentItem;
                 try {
                     await supabaseAdmin
                       .from("steam_inventory_cache")
                       .update({ items: parentCacheItems as any }) 
                       .eq("steam_account_id", steamAccountId);
                 } catch(err) {
                    console.error("[Storage] Failed to update parent inventory cache:", err);
                 }
             }
           }
      }
      
      // 4. Update steam_storage_cache (New logic)
      try {
        await supabaseAdmin.from("steam_storage_cache").upsert({
          steam_account_id: steamAccountId,
          storage_id: storageId,
          items: items as any,
          total_value: totalStorageValue,
          total_items: totalItemsCount,
          updated_at: updatedAt
        }, { onConflict: 'steam_account_id,storage_id' });
        console.log(`[Storage] Cache updated for ${storageId}`);
      } catch (err) {
        console.error("[Storage] Failed to save to steam_storage_cache:", err);
      }

      return { items, totalValue: totalStorageValue, totalItems: totalItemsCount, updatedAt, fromCache: false };

    } catch (error) {
      console.error("[Storage] Failed to load storage items:", error);
      const message = error instanceof Error ? error.message : "Failed to load storage items";
      return reply.code(500).send({ message });
    }
  });

  // POST /storage/:id/deposit - Move items from inventory to storage unit
  app.post<{ Params: { id: string }, Body: { itemIds?: string[] } }>("/storage/:id/deposit", async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const storageId = request.params.id;
    const itemIds = Array.isArray(request.body?.itemIds)
      ? request.body.itemIds.filter((id) => typeof id === "string")
      : [];

    if (!storageId) {
      return reply.code(400).send({ message: "Storage ID is required" });
    }

    if (itemIds.length === 0) {
      return reply.code(400).send({ message: "itemIds must be a non-empty array" });
    }

    try {
      const { client, steamAccountId } = await ensureAuthenticatedClient(request.user.userId, "[Storage Deposit]");

      let inventoryItems: InventoryItemDTO[] = [];
      try {
        const { data } = await supabaseAdmin
          .from("steam_inventory_cache")
          .select("items")
          .eq("steam_account_id", steamAccountId)
          .single();
        if (data?.items && Array.isArray(data.items)) {
          inventoryItems = data.items as InventoryItemDTO[];
        }
      } catch (err) {
        console.warn("[Storage Deposit] Failed to read inventory cache:", err);
      }

      if (inventoryItems.length === 0) {
        inventoryItems = await getInventory(client, steamAccountId, true);
      }

      const inventoryMap = new Map(inventoryItems.map((item) => [item.id, item]));

      const storageItem = inventoryMap.get(storageId);
      let isStorage = isStorageUnit(storageItem);

      if (!isStorage) {
        const rawItems = await client.getInventory();
        const rawStorage = rawItems.find((item) => {
          const id = String(item.id ?? item.assetid ?? "");
          return id === storageId;
        });
        if (rawStorage && Number(rawStorage.def_index) === 1201) {
          isStorage = true;
        }
      }

      if (!isStorage) {
        return reply.code(400).send({ message: "Storage unit not found or invalid" });
      }

      const seen = new Set<string>();
      const results: DepositItemResult[] = [];
      const validItemIds: string[] = [];

      for (const itemId of itemIds) {
        if (seen.has(itemId)) {
          results.push({ itemId, status: "error", reason: "duplicate itemId" });
          continue;
        }
        seen.add(itemId);

        const item = inventoryMap.get(itemId);
        if (!item) {
          results.push({ itemId, status: "error", reason: "item not found in inventory" });
          continue;
        }

        if (!item.moveable) {
          results.push({ itemId, status: "error", reason: "item is not moveable" });
          continue;
        }

        if (isStorageUnit(item)) {
          results.push({ itemId, status: "error", reason: "storage unit cannot be moved" });
          continue;
        }

        validItemIds.push(itemId);
      }

      if (validItemIds.length > 0) {
        const moveResults = await client.moveItems({
          from: "inventory",
          to: "storage",
          storageId,
          itemIds: validItemIds
        });

        for (const result of moveResults) {
          if (result.ok) {
            results.push({ itemId: result.itemId, status: "ok" });
          } else {
            results.push({ itemId: result.itemId, status: "error", reason: result.error ?? "move failed" });
          }
        }
      }

      const okCount = results.filter((r) => r.status === "ok").length;
      const status = okCount === 0 ? "failed" : okCount === results.length ? "ok" : "partial";

      // Invalidate caches after deposit
      invalidateInventoryCache(steamAccountId);
      await supabaseAdmin.from("steam_inventory_cache").delete().eq("steam_account_id", steamAccountId);
      // Keep storage cache items, but expire timestamp so next view will refresh from Steam.
      await supabaseAdmin
        .from("steam_storage_cache")
        .update({ updated_at: new Date(0).toISOString() })
        .eq("steam_account_id", steamAccountId)
        .eq("storage_id", storageId);

      return reply.send({ status, results });
    } catch (error) {
      console.error("[Storage Deposit] Failed to deposit items:", error);
      const message = error instanceof Error ? error.message : "Failed to deposit items";
      return reply.code(500).send({ message });
    }
  });
}
