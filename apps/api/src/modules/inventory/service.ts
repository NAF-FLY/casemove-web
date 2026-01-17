import type {
  InventoryItemDTO,
  InventoryItemSchemaDTO
} from "@casemove/shared-types";

import type { ISteamClient, SteamInventoryItem } from "../../core/steam-client";
import { supabaseAdmin } from "../../core/supabase";
import { skinSchemaService } from "../schema/skin-schema.service";
import { getSchemaItemPriority, matchesTypeHint } from "../schema/schema-helpers";
import { priceService } from "./price.service";

type ItemSchemaLookup = Pick<
  ISteamClient,
  "getItemSchemaItem" | "getItemSchemaName"
>;

type ItemSchemaItem = ReturnType<ItemSchemaLookup["getItemSchemaItem"]>;

export async function getInventory(
  client: ISteamClient | undefined,
  steamAccountId: string
): Promise<InventoryItemDTO[]> {
  // 1. Check cache
  const { data: cache } = await supabaseAdmin
    .from("steam_inventory_cache")
    .select("items, updated_at")
    .eq("steam_account_id", steamAccountId)
    .single();

  if (cache) {
    const age = Date.now() - new Date(cache.updated_at).getTime();
    if (age < 60 * 60 * 1000) { // 1 hour
      console.log("Fetching inventory from cache");
      return cache.items as InventoryItemDTO[];
    }
    console.log(`Inventory cache stale (${age / 1000}s old), refreshing...`);
  } else {
    console.log("Inventory cache miss, fetching from Steam...");
  }

  // 2. Fetch from Steam
  if (!client) {
    throw new Error("Inventory cache miss and Steam client not connected. Please reconnect.");
  }

  const rawItems = await client.getInventory();
  const resolvedItems = resolveSteamInventory(rawItems);
  await client.loadItemSchema();
  const dtos = resolvedItems.map((item) => mapSteamItemToDTO(item, client));

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
  }

  // 4. Save to cache
  await supabaseAdmin.from("steam_inventory_cache").upsert({
    steam_account_id: steamAccountId,
    items: dtos,
    updated_at: new Date().toISOString()
  });

  return dtos;
}

function resolveSteamInventory(
  rawItems: SteamInventoryItem[]
): SteamInventoryItem[] {
  // Detailed raw item logging removed to keep console readable.
  const hiddenItems: Array<{
    id: string;
    def_index: string | number | null;
    inventory: number | null;
    flags: number | null;
    origin: number | null;
    position: number | null;
  }> = [];
  const visibleItems: SteamInventoryItem[] = [];
  for (const item of rawItems) {
    if (isHiddenGcItem(item)) {
      hiddenItems.push({
        id: String(item.id ?? item.assetid ?? ""),
        def_index: item.def_index ?? null,
        inventory: item.inventory ?? null,
        flags: item.flags ?? null,
        origin: item.origin ?? null,
        position: item.position ?? null
      });
      continue;
    }
    visibleItems.push(item);
  }
  console.log(
    `Steam inventory counts: raw=${rawItems.length} hidden=${hiddenItems.length} visible=${visibleItems.length}`
  );

  const dedupedItems: SteamInventoryItem[] = [];
  const seenIds = new Set<string>();
  for (const item of visibleItems) {
    const id = String(item.id ?? item.assetid ?? "");
    if (seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);
    dedupedItems.push(item);
  }
  console.log(
    `Steam inventory counts: deduped=${dedupedItems.length}`
  );

  const slotGroups = new Map<string, SteamInventoryItem[]>();
  const itemsWithoutSlots: SteamInventoryItem[] = [];
  for (const item of dedupedItems) {
    const inventory = item.inventory ?? null;
    const position = item.position ?? null;
    if (inventory === null || position === null) {
      itemsWithoutSlots.push(item);
      continue;
    }
    const key = `${String(inventory)}:${String(position)}`;
    const items = slotGroups.get(key) ?? [];
    items.push(item);
    slotGroups.set(key, items);
  }

  const collisionDetails: Array<{
    slot: string;
    candidates: Array<{
      id: string;
      def_index: string | number | null;
      score: number;
      reason: string;
    }>;
    chosen: { id: string; def_index: string | number | null; score: number; reason: string };
  }> = [];
  const resolvedItems: SteamInventoryItem[] = [...itemsWithoutSlots];

  for (const [slot, items] of slotGroups.entries()) {
    if (items.length === 1) {
      resolvedItems.push(items[0]);
      continue;
    }

    let bestItem = items[0];
    let bestScore = -1;
    let bestReason = "default";

    const candidates = items.map((item) => {
      const { score, reason } = getSlotCollisionScore(item);
      if (score > bestScore) {
        bestItem = item;
        bestScore = score;
        bestReason = reason;
      }
      return {
        id: String(item.id ?? item.assetid ?? ""),
        def_index: item.def_index ?? null,
        score,
        reason
      };
    });

    collisionDetails.push({
      slot,
      candidates,
      chosen: {
        id: String(bestItem.id ?? bestItem.assetid ?? ""),
        def_index: bestItem.def_index ?? null,
        score: bestScore,
        reason: bestReason
      }
    });
    resolvedItems.push(bestItem);
  }

  console.log(
    `Steam inventory collisions: slots=${collisionDetails.length}`
  );
  console.log(
    `Steam inventory counts: resolved=${resolvedItems.length}`
  );

  const minExpected = Math.floor(dedupedItems.length * 0.9);
  if (resolvedItems.length < minExpected) {
    console.warn(
      `Steam inventory collision collapse detected, returning deduped items instead: deduped=${dedupedItems.length} resolved=${resolvedItems.length}`
    );
    return dedupedItems;
  }

  return resolvedItems;
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

function resolveSchemaItemByName(
  defIndex: string | number | null | undefined,
  ...names: Array<string | null | undefined>
): ReturnType<typeof skinSchemaService.getByName> | null {
  for (const name of names) {
    if (!name) {
      continue;
    }
    const direct = skinSchemaService.getByName(name);
    if (direct) {
      return direct;
    }
    const stripped = stripWearSuffix(name);
    if (stripped !== name) {
      const strippedMatch = skinSchemaService.getByName(stripped);
      if (strippedMatch) {
        return strippedMatch;
      }
    }
    if (defIndex !== undefined && defIndex !== null) {
      if (name.startsWith("#")) {
        const byItemName = skinSchemaService.getByOriginalItemName(name, defIndex);
        if (byItemName) {
          return byItemName;
        }
        const byLocName = skinSchemaService.getByOriginalLocName(name, defIndex);
        if (byLocName) {
          return byLocName;
        }
      }
      const byOriginalName = skinSchemaService.getByOriginalName(name, defIndex);
      if (byOriginalName) {
        return byOriginalName;
      }
    }
  }
  return null;
}

function getItemTypeHint(
  rawItem: SteamInventoryItem,
  ...names: Array<string | null | undefined>
): string | null {
  const typeHint = rawItem.type?.trim();
  if (typeHint) {
    return typeHint.toLowerCase();
  }
  const typeTag = rawItem.tags?.find(
    (tag) => tag.category?.toLowerCase() === "type"
  );
  if (typeTag?.name) {
    return typeTag.name.trim().toLowerCase();
  }
  for (const name of names) {
    if (!name) {
      continue;
    }
    const normalized = name.toLowerCase();
    if (normalized.includes("graffiti") || normalized.includes("spray")) {
      return "graffiti";
    }
    if (normalized.includes("music kit") || normalized.includes("musickit")) {
      return "music kit";
    }
    if (normalized.includes("sticker")) {
      return "sticker";
    }
    if (
      normalized.includes("case") ||
      normalized.includes("container") ||
      normalized.includes("capsule") ||
      normalized.includes("package")
    ) {
      return "case";
    }
  }
  return null;
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

function shouldResolveGraffitiFromStickerBranch(
  rawItem: SteamInventoryItem
): boolean {
  const defIndex = Number(rawItem.def_index);
  if (defIndex !== 1348 && defIndex !== 1349) {
    return false;
  }
  if (getPaintWear(rawItem) !== null) {
    return false;
  }
  return true;
}

function isMusicKitBaseItem(
  rawItem: SteamInventoryItem,
  schemaItem: ItemSchemaItem
): boolean {
  const defIndex = Number(rawItem.def_index);
  if (defIndex === 1314) {
    return true;
  }
  const schemaText = [
    schemaItem?.name ?? "",
    schemaItem?.item_name ?? "",
    schemaItem?.item_type_name ?? ""
  ]
    .join(" ")
    .toLowerCase();
  return schemaText.includes("musickit") || schemaText.includes("music kit");
}

function getNumericDefIndex(
  defIndex: string | number | null | undefined
): number | null {
  if (defIndex === null || defIndex === undefined) {
    return null;
  }
  const numeric = Number(defIndex);
  return Number.isFinite(numeric) ? numeric : null;
}

function mapSteamItemToDTO(
  rawItem: SteamInventoryItem,
  schemaLookup: ItemSchemaLookup
): InventoryItemDTO {
  const defIndex = rawItem.def_index;
  const paintIndex = rawItem.paint_index;
  const paintWear = getPaintWear(rawItem);
  const wearName = getWearName(paintWear ?? undefined);
  const hasPaintWear = paintWear !== null && Number.isFinite(paintWear);
  const schemaItem = schemaLookup.getItemSchemaItem(defIndex);
  const schemaName = schemaLookup.getItemSchemaName(defIndex);
  const rawName = rawItem.market_hash_name ?? rawItem.name ?? null;
  const typeHint = getItemTypeHint(rawItem, rawName);
  const nameLookupItem = resolveSchemaItemByName(defIndex, rawName, schemaName);
  const stickerBranchAllowed = shouldResolveGraffitiFromStickerBranch(rawItem);
  const stickerKitId = getStickerKitId(rawItem);
  const graffitiTintId = getGraffitiTintId(rawItem);
  const graffitiKitId =
    stickerKitId ?? (graffitiTintId !== null ? getNumericDefIndex(defIndex) : null);
  const hasGraffitiAttributes = graffitiTintId !== null && graffitiKitId !== null;
  const graffitiItem = hasGraffitiAttributes
    ? skinSchemaService.getGraffitiByKitAndTint(graffitiKitId, graffitiTintId)
    : null;
  const stickerBranchTriggered = stickerBranchAllowed && stickerKitId !== null;
  const musicKitId = isMusicKitBaseItem(rawItem, schemaItem)
    ? getAttributeValue(rawItem, 166, true)
    : null;
  const musicKitItem =
    musicKitId !== null
      ? skinSchemaService.getByDefIndex(musicKitId, rawName, "music kit")
      : null;
  const defIndexItem =
    defIndex !== undefined && defIndex !== null
      ? skinSchemaService.getByDefIndex(defIndex, rawName, typeHint)
      : null;
  const skinItem =
    !hasGraffitiAttributes &&
    hasPaintWear &&
    paintIndex !== undefined &&
    paintIndex !== null
      ? skinSchemaService.getByPaintIndex(paintIndex, wearName, defIndex ?? null)
      : null;
  let baseItem = musicKitItem ?? graffitiItem ?? nameLookupItem ?? defIndexItem;
  if (nameLookupItem && defIndexItem && nameLookupItem.id !== defIndexItem.id) {
    const namePriority = getSchemaItemPriority(nameLookupItem);
    const defPriority = getSchemaItemPriority(defIndexItem);
    if (defPriority > namePriority) {
      baseItem = defIndexItem;
    } else if (namePriority > defPriority) {
      baseItem = nameLookupItem;
    }
  }
  if (
    matchesTypeHint(nameLookupItem, typeHint) &&
    !matchesTypeHint(defIndexItem, typeHint)
  ) {
    baseItem = nameLookupItem;
  } else if (
    matchesTypeHint(defIndexItem, typeHint) &&
    !matchesTypeHint(nameLookupItem, typeHint)
  ) {
    baseItem = defIndexItem;
  }

  let marketHashName: string;
  if (skinItem) {
    const baseName = stripWearSuffix(skinItem.name);
    marketHashName = wearName ? `${baseName} (${wearName})` : skinItem.name;
  } else if (baseItem) {
    marketHashName = baseItem.name;
  } else if (rawName) {
    marketHashName = rawName;
  } else if (schemaName) {
    marketHashName = schemaName;
  } else if (defIndex !== undefined && defIndex !== null) {
    marketHashName = `Unknown item #${defIndex}`;
  } else {
    marketHashName = "Unknown item";
  }

  const schemaSource = skinItem ?? baseItem ?? defIndexItem;
  const image = skinItem?.image ?? baseItem?.image ?? defIndexItem?.image ?? null;
  const schemaDto: InventoryItemSchemaDTO | null = schemaSource
    ? {
        id: schemaSource.id,
        name: marketHashName,
        rarity: schemaSource.rarity?.name ?? null,
        weapon: schemaSource.weapon?.name ?? null,
        collection: schemaSource.collections?.[0]?.name ?? null,
        image
      }
    : null;

  // Mapping debug log removed to reduce console noise.

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

function isHiddenGcItem(rawItem: SteamInventoryItem): boolean {
  const inventory = Number(rawItem.inventory);
  const flags = Number(rawItem.flags);
  const origin = Number(rawItem.origin);
  const position = Number(rawItem.position);
  return inventory === 3221225477 && flags === 24 && origin === 8 && position === 0;
}

function getSlotCollisionScore(rawItem: SteamInventoryItem): {
  score: number;
  reason: string;
} {
  const defIndex = Number(rawItem.def_index);
  const stickerKitId = getStickerKitId(rawItem);
  const graffitiTintId = getGraffitiTintId(rawItem);
  if (
    (defIndex === 1348 || defIndex === 1349) &&
    stickerKitId !== null &&
    graffitiTintId !== null
  ) {
    return { score: 4, reason: "graffiti_container_with_tint" };
  }
  if (getPaintWear(rawItem) !== null) {
    return { score: 3, reason: "weapon_skin_paint_wear" };
  }
  if ((defIndex === 1348 || defIndex === 1349) && stickerKitId !== null) {
    return { score: 2, reason: "graffiti_container_sticker_id" };
  }
  return { score: 1, reason: "default" };
}
