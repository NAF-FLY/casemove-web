import fs from "node:fs";
import path from "node:path";

import { getSchemaItemPriority, matchesTypeHint } from "./schema-helpers";

export type SkinSchemaRarity = {
  id: string;
  name: string;
  color?: string | null;
};

export type SkinSchemaCollection = {
  id: string;
  name: string;
  image?: string | null;
};

export type SkinSchemaTeam = {
  id: string;
  name: string;
};

export type SkinSchemaOriginal = {
  item_name?: string | null;
  name?: string | null;
  loc_name?: string | null;
  image_inventory?: string | null;
};

export type SkinSchemaWeapon = {
  id: string;
  name: string;
  weapon_id?: number | null;
};

export type SkinSchemaWear = {
  id: string;
  name: string;
};

export type SkinSchema = {
  id: string;
  name: string;
  description?: string | null;
  def_index?: string | null;
  paint_index?: string | number | null;
  rarity?: SkinSchemaRarity | null;
  collections?: SkinSchemaCollection[] | null;
  weapon?: SkinSchemaWeapon | null;
  team?: SkinSchemaTeam | null;
  market_hash_name?: string | null;
  image?: string | null;
  model_player?: string | null;
  wear?: SkinSchemaWear | null;
  original?: SkinSchemaOriginal | null;
};

export class SkinSchemaService {
  private itemsByName = new Map<string, SkinSchema>();
  private itemsByDefIndex = new Map<string, SkinSchema>();
  private itemsByDefIndexList = new Map<string, SkinSchema[]>();
  private itemsByPaintIndex = new Map<string, SkinSchema[]>();
  private itemsByOriginalItemName = new Map<string, SkinSchema[]>();
  private itemsByOriginalLocName = new Map<string, SkinSchema[]>();
  private itemsByOriginalName = new Map<string, SkinSchema[]>();

  async init(): Promise<void> {
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "data",
      "items",
      "items.json"
    );
    const raw = fs.readFileSync(filePath, "utf-8");
    const items = JSON.parse(raw) as Record<string, SkinSchema>;

    Object.values(items).forEach((item) => {
      this.itemsByName.set(item.name, item);
      if (item.market_hash_name && item.market_hash_name !== item.name) {
        this.itemsByName.set(item.market_hash_name, item);
      }
      const normalizedDefIndex = normalizeIndex(item.def_index);
      if (normalizedDefIndex) {
        const items = this.itemsByDefIndexList.get(normalizedDefIndex) ?? [];
        items.push(item);
        this.itemsByDefIndexList.set(normalizedDefIndex, items);

        const existing = this.itemsByDefIndex.get(normalizedDefIndex);
        if (!existing) {
          this.itemsByDefIndex.set(normalizedDefIndex, item);
        } else if (existing.id !== item.id) {
          const existingPriority = getSchemaItemPriority(existing);
          const incomingPriority = getSchemaItemPriority(item);
          let action: "kept_existing" | "replaced_existing" = "kept_existing";
          if (incomingPriority > existingPriority) {
            this.itemsByDefIndex.set(normalizedDefIndex, item);
            action = "replaced_existing";
          }
        }
      }
      const normalizedPaintIndex = normalizeIndex(item.paint_index);
      if (normalizedPaintIndex) {
        const items = this.itemsByPaintIndex.get(normalizedPaintIndex) ?? [];
        items.push(item);
        this.itemsByPaintIndex.set(normalizedPaintIndex, items);
      }
      if (item.original?.item_name) {
        const items = this.itemsByOriginalItemName.get(item.original.item_name) ?? [];
        items.push(item);
        this.itemsByOriginalItemName.set(item.original.item_name, items);
      }
      if (item.original?.loc_name) {
        const items = this.itemsByOriginalLocName.get(item.original.loc_name) ?? [];
        items.push(item);
        this.itemsByOriginalLocName.set(item.original.loc_name, items);
      }
      if (item.original?.name) {
        const items = this.itemsByOriginalName.get(item.original.name) ?? [];
        items.push(item);
        this.itemsByOriginalName.set(item.original.name, items);
      }
    });

  }

  getByName(name: string): SkinSchema | null {
    return this.itemsByName.get(name) ?? null;
  }

  getByDefIndex(
    defIndex: string | number,
    hint?: string | null,
    typeHint?: string | null
  ): SkinSchema | null {
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return null;
    }
    const items = this.itemsByDefIndexList.get(normalizedDefIndex);
    if (!items || items.length === 0) {
      return null;
    }
    if (items.length === 1) {
      return items[0] ?? null;
    }
    const hasConflict = hasDefIndexCategoryConflict(items);
    const canUseHint = Boolean(hint) && (!hasConflict || Boolean(typeHint));
    if (hint && canUseHint) {
      const byName = items.find(
        (item) => item.name === hint || item.market_hash_name === hint
      );
      if (byName) {
        return byName;
      }
      const byOriginal = items.find(
        (item) =>
          item.original?.item_name === hint ||
          item.original?.loc_name === hint ||
          item.original?.name === hint
      );
      if (byOriginal) {
        return byOriginal;
      }
    }
    if (typeHint) {
      const normalizedTypeHint = normalizeTypeHint(typeHint);
      if (normalizedTypeHint) {
        const byType = items.find((item) =>
          matchesTypeHint(item, normalizedTypeHint)
        );
        if (byType) {
          return byType;
        }
      }
    }
    const primary = this.itemsByDefIndex.get(normalizedDefIndex);
    if (primary) {
      return primary;
    }
    return items[0] ?? null;
  }

  getByPaintIndex(
    paintIndex: string | number,
    wearName?: string | null,
    weaponId?: string | number | null
  ): SkinSchema | null {
    const normalizedPaintIndex = normalizeIndex(paintIndex);
    if (!normalizedPaintIndex) {
      return null;
    }
    const itemsForPaint = this.itemsByPaintIndex.get(normalizedPaintIndex);
    if (!itemsForPaint || itemsForPaint.length === 0) {
      return null;
    }
    let items = itemsForPaint;
    if (weaponId !== undefined && weaponId !== null) {
      const weaponIdNumber = Number(weaponId);
      if (Number.isFinite(weaponIdNumber)) {
        const weaponMatches = itemsForPaint.filter(
          (item) => item.weapon?.weapon_id === weaponIdNumber
        );
        if (weaponMatches.length > 0) {
          items = weaponMatches;
        }
      }
    }
    if (wearName) {
      const match = items.find((item) => item.wear?.name === wearName);
      if (match) {
        return match;
      }
      const suffix = `(${wearName})`;
      const suffixMatch = items.find(
        (item) =>
          item.name.endsWith(suffix) ||
          (item.market_hash_name?.endsWith(suffix) ?? false)
      );
      if (suffixMatch) {
        return suffixMatch;
      }
    }
    return items[0] ?? null;
  }

  getGraffitiByKitAndTint(
    kitId: string | number,
    tintId?: number | null
  ): SkinSchema | null {
    const normalizedKitId = normalizeIndex(kitId);
    if (!normalizedKitId) {
      return null;
    }
    const items = this.itemsByDefIndexList.get(normalizedKitId);
    if (!items || items.length === 0) {
      return null;
    }
    const graffitiItems = items.filter((item) => item.id.startsWith("graffiti-"));
    if (graffitiItems.length === 0) {
      return null;
    }
    if (tintId !== null && tintId !== undefined) {
      const candidateIds = [
        `graffiti-${normalizedKitId}_${tintId}`,
        `graffiti-${normalizedKitId}_${tintId + 1}`,
        `graffiti-${normalizedKitId}`
      ];
      const match = graffitiItems.find((item) => candidateIds.includes(item.id));
      if (match) {
        return match;
      }
    }
    return graffitiItems[0] ?? null;
  }

  getByOriginalItemName(
    itemName: string,
    defIndex?: string | number | null
  ): SkinSchema | null {
    return this.findByOriginalKey(this.itemsByOriginalItemName, itemName, defIndex);
  }

  getByOriginalLocName(
    locName: string,
    defIndex?: string | number | null
  ): SkinSchema | null {
    return this.findByOriginalKey(this.itemsByOriginalLocName, locName, defIndex);
  }

  getByOriginalName(
    originalName: string,
    defIndex?: string | number | null
  ): SkinSchema | null {
    return this.findByOriginalKey(this.itemsByOriginalName, originalName, defIndex);
  }

  private findByOriginalKey(
    map: Map<string, SkinSchema[]>,
    key: string,
    defIndex?: string | number | null
  ): SkinSchema | null {
    const items = map.get(key);
    if (!items || items.length === 0) {
      return null;
    }
    if (defIndex === undefined || defIndex === null) {
      return items[0] ?? null;
    }
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return items[0] ?? null;
    }
    const match = items.find(
      (item) => normalizeIndex(item.def_index) === normalizedDefIndex
    );
    return match ?? items[0] ?? null;
  }
}

export const skinSchemaService = new SkinSchemaService();

function normalizeIndex(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    return null;
  }
  return String(value);
}

function normalizeTypeHint(typeHint: string): string | null {
  const normalized = typeHint.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function hasDefIndexCategoryConflict(items: SkinSchema[]): boolean {
  const categories = new Set<string>();
  items.forEach((item) => {
    categories.add(getItemCategory(item));
  });
  return categories.size > 1;
}

function getItemCategory(item: SkinSchema): string {
  const id = item.id.toLowerCase();
  if (id.startsWith("music_kit-") || id.startsWith("music-kit-")) {
    return "music_kit";
  }
  if (id.startsWith("sticker-") || id.startsWith("sticker_slab-")) {
    return "sticker";
  }
  if (id.startsWith("graffiti-")) {
    return "graffiti";
  }
  if (id.startsWith("keychain-")) {
    return "keychain";
  }
  if (
    id.startsWith("weapon-") ||
    id.startsWith("skin-") ||
    id.startsWith("agent-") ||
    id.startsWith("glove-") ||
    id.startsWith("gloves-") ||
    id.startsWith("crate-") ||
    id.startsWith("case-") ||
    id.startsWith("tool-") ||
    id.startsWith("collectible-") ||
    id.startsWith("pin-") ||
    id.startsWith("patch-")
  ) {
    return "base";
  }
  return "other";
}
