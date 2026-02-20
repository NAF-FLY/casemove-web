import type {
  InventoryItemDTO,
  InventoryItemSchemaDTO
} from "@casemove/shared-types";

import type { ISteamClient, SteamInventoryItem } from "../../core/steam-client";
import { supabaseAdmin } from "../../core/supabase";
import { skinSchemaService, type SkinSchema } from "../schema/skin-schema.service";
import { ensureAuthenticatedClient } from "../steam-accounts/connection.utils";

import { priceService } from "./price.service";

type ItemSchemaLookup = Pick<
  ISteamClient,
  "getItemSchemaName"
>;

const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const memoryCache = new Map<string, { items: InventoryItemDTO[], expiresAt: number }>();

export function invalidateInventoryCache(steamAccountId: string) {
  memoryCache.delete(steamAccountId);
}

export async function getInventory(
  client: ISteamClient | undefined,
  steamAccountId: string,
  forceRefresh = false,
  cacheTtlMs = 60 * 60 * 1000
): Promise<InventoryItemDTO[]> {

  const now = Date.now();

  // 0. Check in-memory cache (Emergency layer)
  if (!forceRefresh) {
    const cached = memoryCache.get(steamAccountId);
    if (cached && cached.expiresAt > now) {
      console.log("[Inventory] Serving from memory cache");
      return cached.items;
    }
  }

  // 1. Check cache (skip if forceRefresh)
  if (!forceRefresh) {
    try {
      const { data: cache } = await supabaseAdmin
        .from("steam_inventory_cache")
        .select("items, updated_at")
        .eq("steam_account_id", steamAccountId)
        .single();

      if (cache) {
        const age = now - new Date(cache.updated_at).getTime();
        if (age < cacheTtlMs) {
          return cache.items as InventoryItemDTO[];
        }
      }
    } catch (err) {
      console.warn("[Inventory] Failed to check Supabase cache, proceeding to fetch:", err);
    }
  }

  // 2. Fetch from Steam
  if (!client) {
    throw new Error("Inventory cache miss and Steam client not connected. Please reconnect.");
  }

  // PRE-FETCH: Try to get existing cache to preserve storage metadata (price/count)
  // We do this even on forceRefresh because Steam doesn't return this data
  const storageMetadataMap = new Map<string, { price: number, count: number }>();
  try {
    const { data: oldCache } = await supabaseAdmin
      .from("steam_inventory_cache")
      .select("items")
      .eq("steam_account_id", steamAccountId)
      .single();

    if (oldCache?.items && Array.isArray(oldCache.items)) {
      const oldItems = oldCache.items as InventoryItemDTO[];
      let preservedCount = 0;
      for (const item of oldItems) {
        if ((item.storagePrice !== undefined && item.storagePrice !== null) || 
            (item.storageItemsCount !== undefined && item.storageItemsCount !== null)) {
          // Identify by ID (AssetID) which should be stable for the generic Storage Unit item itself
          storageMetadataMap.set(item.id, { 
            price: item.storagePrice ?? 0, 
            count: item.storageItemsCount ?? 0 
          });
          preservedCount++;
        }
      }
      if (preservedCount > 0) {
        console.log(`[Inventory] Found ${preservedCount} items with preserved storage metadata in cache`);
      }
    }
  } catch (err) {
    console.warn("[Inventory] Failed to read old cache for metadata preservation:", err);
  }

  const rawItems = await client.getInventory();
  const resolvedItems = resolveSteamInventory(rawItems);
  await client.loadItemSchema();
  
  const dtos = resolvedItems
    .map((item) => mapSteamItemToDTO(item, client))
    .sort((a, b) => {
      // Sort by Asset ID descending (Newest first)
      try {
        const idA = BigInt(a.id || "0");
        const idB = BigInt(b.id || "0");
        return idA < idB ? 1 : idA > idB ? -1 : 0;
      } catch {
        return 0;
      }
    });

  // 3. Populate prices immediately (so they are cached)
  const marketHashNames = dtos
    .map((d) => d.marketHashName)
    .filter((n): n is string => !!n);
  
  const uniqueNames = Array.from(new Set(marketHashNames));
  const priceMap = await priceService.getPrices(uniqueNames);

  for (const dto of dtos) {
    if (dto.marketHashName) {
      const price = priceMap.get(dto.marketHashName);
      if (typeof price === 'number') {
        dto.price = price;
        dto.priceCurrency = 'USD';
      }
    }

    // RESTORE STORAGE METADATA
    // Check if this item is a storage unit and we have preserved data for it
    const preserved = storageMetadataMap.get(dto.id);
    if (preserved) {
      // Basic check to ensure it's still a storage unit (def_index 1201 or similar logic)
      // We assume ID collision is impossible so straight assignment is safe
      if (preserved.price > 0) dto.storagePrice = preserved.price;
      if (preserved.count > 0) dto.storageItemsCount = preserved.count;
    }
  }

  // Save to memory cache immediately
  memoryCache.set(steamAccountId, {
    items: dtos,
    expiresAt: now + MEMORY_CACHE_TTL
  });

  // 4. Save to cache
  try {
    await supabaseAdmin.from("steam_inventory_cache").upsert({
      steam_account_id: steamAccountId,
      items: dtos,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("[Inventory] Failed to save inventory to Supabase cache (serving from memory):", err);
    // Do not throw, return items anyway
  }

  return dtos;
}

export async function takeInventorySnapshot(steamAccountId: string) {
  try {
    const { client } = await ensureAuthenticatedClient(steamAccountId, "[Snapshot]");
    const items = await getInventory(client, steamAccountId, true);

    if (!items || items.length === 0) {
      console.log(`[Snapshot] No items found for account ${steamAccountId}, skipping snapshot`);
      return;
    }

    const totalValue = items.reduce((sum, item) => sum + (item.price ?? 0), 0);

    await supabaseAdmin
      .from("inventory_snapshots")
      .insert({
        steam_account_id: steamAccountId,
        storage_id: null,
        total_value: totalValue
      });

    console.log(`[Snapshot] Saved main inventory snapshot for ${steamAccountId} (Value: $${totalValue.toFixed(2)})`);

    const storageUnits = items.filter(
      item => item.schema?.name?.startsWith("Storage Unit | ") || item.schema?.name === "Storage Unit"
    );

    for (const storage of storageUnits) {
      const storageValue = storage.storagePrice ?? 0;
      if (storageValue > 0) {
        await supabaseAdmin
          .from("inventory_snapshots")
          .insert({
            steam_account_id: steamAccountId,
            storage_id: storage.id,
            total_value: storageValue
          });
        console.log(`[Snapshot] Saved storage snapshot for ${steamAccountId} / ${storage.marketHashName} (Value: $${storageValue.toFixed(2)})`);
      }
    }

  } catch (err) {
    console.error(`[Snapshot] Failed to take snapshot for account ${steamAccountId}:`, err);
  }
}

function resolveSteamInventory(
  rawItems: SteamInventoryItem[]
): SteamInventoryItem[] {
  return rawItems.filter((item) => !shouldHideItem(item));
}

function shouldHideItem(item: SteamInventoryItem): boolean {
  const defIndex = Number(item.def_index);
  
  // Filter known service/hidden items
  if (defIndex === 4001) return true; // C4 / Service item
  if (defIndex === 36) return true;   // C4 / Service item
  if (defIndex === 1348) return true; // Unsealed Graffiti (Not tradable/usable in inventory context)

  // Filter items that are inside a storage unit (casket)
  if (item.casket_id) return true;

  return false;
}

function getWearName(paintWear?: number): string | null {
  if (paintWear === null || paintWear === undefined) {
    return null;
  }
  if (!Number.isFinite(paintWear)) {
    return null;
  }
  if (paintWear < 0.07) {
    return "Factory New";
  }
  if (paintWear < 0.15) {
    return "Minimal Wear";
  }
  if (paintWear < 0.38) {
    return "Field-Tested";
  }
  if (paintWear < 0.45) {
    return "Well-Worn";
  }
  return "Battle-Scarred";
}

function stripWearSuffix(name: string): string {
  const match = name.match(
    /^(.*)\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/
  );
  if (!match) {
    return name;
  }
  return match[1].trim();
}

function hasStatTrakPrefix(name: string): boolean {
  return /^StatTrak™\s/i.test(name);
}

function isStatTrakItem(rawItem: SteamInventoryItem): boolean {
  const attributes = rawItem.attribute ?? [];
  if (attributes.some((attr) => attr.def_index === 80 || attr.def_index === 81)) {
    return true;
  }
  const haystacks = [
    rawItem.market_hash_name,
    rawItem.name,
    rawItem.type
  ].filter((value): value is string => typeof value === "string");
  return haystacks.some((value) => value.toLowerCase().includes("stattrak"));
}



function getAttributeValue(
  rawItem: SteamInventoryItem,
  defIndex: number,
  preferBytes = false
): number | null {
  const attributes = rawItem.attribute ?? [];
  const attribute = attributes.find((entry) => entry.def_index === defIndex);
  if (!attribute) {
    return null;
  }
  const valueFromNumber =
    typeof attribute.value === "number" && Number.isFinite(attribute.value)
      ? Math.trunc(attribute.value)
      : null;
  const valueFromBytes =
    attribute.value_bytes && attribute.value_bytes.length >= 4
      ? attribute.value_bytes.readUInt32LE(0)
      : null;
  const valueFromString =
    typeof attribute.value_string === "string"
      ? (() => {
          const parsed = Number(attribute.value_string);
          return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
        })()
      : null;

  const ordered = preferBytes
    ? [valueFromBytes, valueFromNumber, valueFromString]
    : [valueFromNumber, valueFromBytes, valueFromString];
  for (const value of ordered) {
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function getAttributeFloatValue(
  rawItem: SteamInventoryItem,
  defIndex: number,
  preferBytes = true
): number | null {
  const attributes = rawItem.attribute ?? [];
  const attribute = attributes.find((entry) => entry.def_index === defIndex);
  if (!attribute) {
    return null;
  }
  const valueFromNumber =
    typeof attribute.value === "number" && Number.isFinite(attribute.value)
      ? attribute.value
      : null;
  const valueFromBytes =
    attribute.value_bytes && attribute.value_bytes.length >= 4
      ? attribute.value_bytes.readFloatLE(0)
      : null;
  const valueFromString =
    typeof attribute.value_string === "string"
      ? (() => {
          const parsed = Number(attribute.value_string);
          return Number.isFinite(parsed) ? parsed : null;
        })()
      : null;

  const ordered = preferBytes
    ? [valueFromBytes, valueFromNumber, valueFromString]
    : [valueFromNumber, valueFromBytes, valueFromString];
  for (const value of ordered) {
    if (value !== null && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function getPaintWear(rawItem: SteamInventoryItem): number | null {
  const wear =
    typeof rawItem.paint_wear === "number" && Number.isFinite(rawItem.paint_wear)
      ? rawItem.paint_wear
      : null;
  if (wear !== null) {
    return wear;
  }
  const wearFromAttributes = getAttributeFloatValue(rawItem, 8, true);
  if (wearFromAttributes === null) {
    return null;
  }
  if (wearFromAttributes < 0 || wearFromAttributes > 1) {
    return null;
  }
  return wearFromAttributes;
}

function getStickerKitId(rawItem: SteamInventoryItem): number | null {
  const stickerId = rawItem.stickers?.[0]?.sticker_id;
  if (typeof stickerId === "number" && Number.isFinite(stickerId)) {
    return stickerId;
  }
  return getAttributeValue(rawItem, 113);
}

function getGraffitiTintId(rawItem: SteamInventoryItem): number | null {
  const tint = getAttributeValue(rawItem, 233) ?? getAttributeValue(rawItem, 232);
  if (tint === null) {
    return null;
  }
  if (tint < 0 || tint > 19) {
    return null;
  }
  return tint;
}



type ItemTypeResolution = {
  type: 'highlight' | 'slab' | 'keychain' | 'sticker' | 'music_kit' | 'graffiti' | 'skin' | 'tool' | 'agent' | 'crate' | 'patch' | 'collectible' | 'other';
  lookupId?: number | null;
  lookupMethod: 'def_index' | 'attr' | 'paint' | 'name' | 'none';
};

function resolveItemType(
  rawItem: SteamInventoryItem
): ItemTypeResolution {
  const defIndex = Number(rawItem.def_index);
  
  // 1. Check Container 1355 Special Items (Keychains, Highlights, Sticker Slabs)
  if (defIndex === 1355) {
    const highlightId = getAttributeValue(rawItem, 314, true);
    if (highlightId !== null) {
      return { type: 'highlight', lookupId: highlightId, lookupMethod: 'attr' };
    }
    const slabStickerId = getAttributeValue(rawItem, 321, true);
    if (slabStickerId !== null) {
      return { type: 'slab', lookupId: slabStickerId, lookupMethod: 'attr' };
    }
    const keychainId = getAttributeValue(rawItem, 299, true);
    if (keychainId !== null) {
      return { type: 'keychain', lookupId: keychainId, lookupMethod: 'attr' };
    }
    // Fallback if inside container but no attributes found (shouldn't happen for valid items)
    return { type: 'other', lookupMethod: 'name' };
  }

  // 2. Skins (Pre-check by attributes)
  // CRITICAL: We check this BEFORE stickers because some weapons (e.g. def_index 7 AK-47) 
  // share IDs with legacy stickers (def_index 7 Sticker | Polar Bears).
  // If an item has paint_index or paint_wear, it is definitely a Skin/Weapon/Glove, NOT a sticker.
  const paintWear = getPaintWear(rawItem);
  const paintIndex = rawItem.paint_index;
  if (paintWear !== null || (paintIndex !== undefined && paintIndex !== null)) {
    // If it has paint, it's a skin.
    return { type: 'skin', lookupId: paintIndex, lookupMethod: 'paint' };
  }
  
  // 3. Tools
  const toolFromMap = skinSchemaService.getToolByDefIndex(defIndex);
  if (toolFromMap) {
    return { type: 'tool', lookupId: defIndex, lookupMethod: 'def_index' };
  }
  
  // 4. Agents
  const agentFromMap = skinSchemaService.getAgentByDefIndex(defIndex);
  if (agentFromMap) {
    return { type: 'agent', lookupId: defIndex, lookupMethod: 'def_index' };
  }

  // 5. Crates
  const crateFromMap = skinSchemaService.getCrateByDefIndex(defIndex);
  if (crateFromMap) {
    return { type: 'crate', lookupId: defIndex, lookupMethod: 'def_index' };
  }

  // 6. Collectibles
  const collectibleFromMap = skinSchemaService.getCollectibleByDefIndex(defIndex);
  if (collectibleFromMap) {
    return { type: 'collectible', lookupId: defIndex, lookupMethod: 'def_index' };
  }

  // 7. Patches
  const patchFromMap = skinSchemaService.getPatchByDefIndex(defIndex);
  if (patchFromMap) {
    return { type: 'patch', lookupId: defIndex, lookupMethod: 'def_index' };
  }

  // 8. Graffiti
  // Explicit check for Graffiti Container 1348 (Unsealed Graffiti) and 1349 (Sealed Graffiti)
  // These have Sticker ID (Attr 113) and Tint (Attr 233)
  if (defIndex === 1348 || defIndex === 1349) {
    const graffitiId = getStickerKitId(rawItem);
    return { type: 'graffiti', lookupId: graffitiId, lookupMethod: 'attr' };
  }
  
  const graffitiFromMap = skinSchemaService.getGraffitiByDefIndex(defIndex);
  if (graffitiFromMap) {
    // Should we use tint? Maps map base graffiti.
    // DTO mapping will retrieve it.
    // Use stickerKitId/defIndex logic from legacy if needed, or just defIndex
    const stickerKitId = getStickerKitId(rawItem);
    return { type: 'graffiti', lookupId: stickerKitId ?? defIndex, lookupMethod: 'def_index' };
  }
  
  // 9. Keychains (standalone)
  const keychainFromMap = skinSchemaService.getKeychainByDefIndex(defIndex);
  if (keychainFromMap) {
    return { type: 'keychain', lookupId: defIndex, lookupMethod: 'def_index' };
  }

  // 10. Stickers (Strict Type Check)
  // We strictly check if the item acts like a sticker (via type/tags) OR is a known container.
  // This avoids ID collisions where Weapon ID 1 matches Sticker Kit ID 1.
  const isStickerType = 
    rawItem.type?.toLowerCase().includes('sticker') ||
    rawItem.tags?.some(tag => tag.category?.toLowerCase() === 'type' && tag.name?.toLowerCase() === 'sticker') ||
    defIndex === 1209; // Standard Sticker Item ID

  if (isStickerType) {
    if (defIndex === 1209) {
      const stickerId = getStickerKitId(rawItem);
      return { type: 'sticker', lookupId: stickerId, lookupMethod: 'attr' };
    }
    const stickerFromMap = skinSchemaService.getStickerByDefIndex(defIndex);
    if (stickerFromMap) {
       return { type: 'sticker', lookupId: defIndex, lookupMethod: 'def_index' };
    }
  }

  // 11. Music Kits (Strict Type Check)
  const isMusicKitType = 
      rawItem.type?.toLowerCase().includes('music kit') ||
      rawItem.tags?.some(tag => tag.category?.toLowerCase() === 'type' && tag.name?.toLowerCase() === 'music kit') ||
      defIndex === 1314;

  if (isMusicKitType) {
    if (defIndex === 1314) {
        const musicKitId = getAttributeValue(rawItem, 166, true);
        return { type: 'music_kit', lookupId: musicKitId, lookupMethod: 'attr' };
    }
    const musicKitFromMap = skinSchemaService.getMusicKitByDefIndex(defIndex);
    if (musicKitFromMap) {
        return { type: 'music_kit', lookupId: defIndex, lookupMethod: 'def_index' };
    }
  }

  // 12. Skins fallback (Generic check for strict map match)
  const skinFromMap = skinSchemaService.getSkinByDefIndex(defIndex);
  if (skinFromMap) {
      return { type: 'skin', lookupId: rawItem.paint_index ?? defIndex, lookupMethod: 'paint' };
  }
  // Generic check for paint_index if not in skin map (e.g. new weapon not in skins.json yet but has paint)
  if (rawItem.paint_index !== undefined && rawItem.paint_index !== null) {
     return { type: 'skin', lookupId: rawItem.paint_index, lookupMethod: 'paint' };
  }
  
  // Final Fallback: Unknown
  return { type: 'other', lookupId: defIndex, lookupMethod: 'def_index' };
}


// Exported for use in storage module
export type { ItemSchemaLookup };

export function mapSteamItemToDTO(
  rawItem: SteamInventoryItem,
  schemaLookup: ItemSchemaLookup
): InventoryItemDTO {
  const defIndex = rawItem.def_index;

  const paintWear = getPaintWear(rawItem);
  const wearName = getWearName(paintWear ?? undefined);
  const hasPaintWear = paintWear !== null && Number.isFinite(paintWear);
  const schemaName = schemaLookup.getItemSchemaName(defIndex);
  const rawName = rawItem.market_hash_name ?? rawItem.name ?? null;
  const statTrak = isStatTrakItem(rawItem);

  const resolution = resolveItemType(rawItem);
  let baseItem: SkinSchema | null = null;

  switch (resolution.type) {
    case 'highlight':
      if (resolution.lookupId !== null && resolution.lookupId !== undefined) {
        baseItem = skinSchemaService.getHighlightByDefIndex(resolution.lookupId);
      }
      break;
    case 'slab':
      if (resolution.lookupId !== null && resolution.lookupId !== undefined) {
        baseItem = skinSchemaService.getSlabByDefIndex(resolution.lookupId);
      }
      break;
    case 'keychain':
      if (resolution.lookupId !== null && resolution.lookupId !== undefined) {
        baseItem = skinSchemaService.getKeychainByDefIndex(resolution.lookupId);
      }
      break;
    case 'sticker':
      if (resolution.lookupId !== null && resolution.lookupId !== undefined) {
        baseItem = skinSchemaService.getStickerByDefIndex(resolution.lookupId);
      }
      break;
    case 'music_kit':
      if (resolution.lookupId !== null && resolution.lookupId !== undefined) {
        baseItem = skinSchemaService.getMusicKitByDefIndex(resolution.lookupId);
      }
      break;
    case 'graffiti':
      if (resolution.lookupId !== null && resolution.lookupId !== undefined) {
        const tint = getGraffitiTintId(rawItem);
        baseItem = skinSchemaService.getGraffitiByKitAndTint(resolution.lookupId, tint);
      }
      break;
    case 'skin':
      if (resolution.lookupId !== null && resolution.lookupId !== undefined) {
        baseItem = skinSchemaService.getByPaintIndex(resolution.lookupId, wearName, defIndex ?? null);
      }
      break;
    case 'tool':
       if (resolution.lookupId !== null && resolution.lookupId !== undefined) {
        baseItem = skinSchemaService.getToolByDefIndex(resolution.lookupId);
      }
      break;
    case 'agent':
      if (resolution.lookupId !== null && resolution.lookupId !== undefined) {
        baseItem = skinSchemaService.getAgentByDefIndex(resolution.lookupId);
      }
      break;
    case 'crate':
      if (resolution.lookupId !== null && resolution.lookupId !== undefined) {
        baseItem = skinSchemaService.getCrateByDefIndex(resolution.lookupId);
      }
      break;
    case 'collectible':
      if (resolution.lookupId !== null && resolution.lookupId !== undefined) {
        baseItem = skinSchemaService.getCollectibleByDefIndex(resolution.lookupId);
      }
      break;
    case 'patch':
      if (resolution.lookupId !== null && resolution.lookupId !== undefined) {
        baseItem = skinSchemaService.getPatchByDefIndex(resolution.lookupId);
      }
      break;
    case 'other':
      // Fallback: Unknown
      if (rawName) {
           baseItem = skinSchemaService.getByName(rawName);
      }
      break;
  }





  // 3. Construct DTO
  let marketHashName: string;
  
  // Special case: Storage Units (def_index 1201) should prioritize custom_name
  if (defIndex === 1201 && rawItem.custom_name) {
    marketHashName = `Storage Unit | ${rawItem.custom_name}`;
  } else if (baseItem) {
    // If it's a skin with wear, append the wear
    if (hasPaintWear && wearName && baseItem.id.startsWith('skin-')) {
       // Ideally baseItem name for skins shouldn't have wear, but let's be safe
       const baseName = stripWearSuffix(baseItem.name);
       marketHashName = `${baseName} (${wearName})`;
    } else {
       marketHashName = baseItem.name;
    }
  } else if (rawItem.custom_name) {
    marketHashName = rawItem.custom_name;
  } else if (rawName) {
    marketHashName = rawName;
  } else if (schemaName) {
    marketHashName = schemaName;
  } else if (defIndex !== undefined && defIndex !== null) {
    marketHashName = `Unknown item #${defIndex}`;
  } else {
    marketHashName = "Unknown item";
  }

  if (statTrak && !hasStatTrakPrefix(marketHashName)) {
    marketHashName = `StatTrak™ ${marketHashName}`;
  }

  // Use the resolved item for schema info
  const image = baseItem?.image ?? null;

  const schemaDto: InventoryItemSchemaDTO | null = baseItem
    ? {
        id: baseItem.id,
        name: marketHashName,
        rarity: baseItem.rarity?.name ?? null,
        weapon: baseItem.weapon?.name ?? null,
        collection: baseItem.collections?.[0]?.name ?? null,
        image
      }
    : null;

  // Steam returns icon_url as just a CDN hash, need to prepend base URL
  const iconHash = rawItem.icon_url ?? rawItem.icon ?? null;
  const iconUrl = iconHash && !iconHash.startsWith("http")
    ? `https://steamcommunity-a.akamaihd.net/economy/image/${iconHash}`
    : iconHash;

  return {
    id: String(rawItem.id ?? rawItem.assetid ?? ""),
    appId: 730,
    marketHashName,
    iconUrl,
    moveable: Boolean(rawItem.item_moveable ?? rawItem.marketable ?? true),
    tradable: Boolean(rawItem.tradable ?? true),
    paintWear: hasPaintWear ? paintWear : null,
    schema: schemaDto
  };
}
