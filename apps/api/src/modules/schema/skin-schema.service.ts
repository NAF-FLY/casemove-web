import fs from "node:fs";
import path from "node:path";



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
  private itemsByPaintIndex = new Map<string, SkinSchema[]>();
  private highlightsByDefIndex = new Map<string, SkinSchema>();
  private slabsByDefIndex = new Map<string, SkinSchema>();
  private toolsByDefIndex = new Map<string, SkinSchema>();
  private stickersByDefIndex = new Map<string, SkinSchema>();
  private keychainsByDefIndex = new Map<string, SkinSchema>();
  private musicKitsByDefIndex = new Map<string, SkinSchema>();
  private agentsByDefIndex = new Map<string, SkinSchema>();
  private cratesByDefIndex = new Map<string, SkinSchema>();
  private patchesByDefIndex = new Map<string, SkinSchema>();
  private collectiblesByDefIndex = new Map<string, SkinSchema>();
  private graffitiByDefIndex = new Map<string, SkinSchema>();
  private skinsByDefIndex = new Map<string, SkinSchema>();

  async init(): Promise<void> {
    const dataDir = path.join(__dirname, "..", "..", "data", "items");
    
    // 1. Agents
    this.loadSpecificMap("agents.json", this.agentsByDefIndex, dataDir);

    // 2. Collectibles
    this.loadSpecificMap("collectibles.json", this.collectiblesByDefIndex, dataDir);

    // 3. Crates
    this.loadSpecificMap("crates.json", this.cratesByDefIndex, dataDir);

    // 4. Graffiti
    this.loadSpecificMap("graffiti.json", this.graffitiByDefIndex, dataDir);

    // 5. Patches
    this.loadSpecificMap("patches.json", this.patchesByDefIndex, dataDir);

    // 6. Tools
    this.loadSpecificMap("tools.json", this.toolsByDefIndex, dataDir);

    // 7. Stickers
    this.loadSpecificMap("stickers.json", this.stickersByDefIndex, dataDir);

    // 8. Keychains
    this.loadSpecificMap("keychains.json", this.keychainsByDefIndex, dataDir);

    // 9. Music Kits
    this.loadSpecificMap("music_kits.json", this.musicKitsByDefIndex, dataDir);

    // 10. Highlights
    this.loadSpecificMap("highlights.json", this.highlightsByDefIndex, dataDir);

    // 11. Sticker Slabs
    this.loadSpecificMap("sticker_slabs.json", this.slabsByDefIndex, dataDir);

    // 12. Skins (Main source for paint_index)
    // We load this specially because we also need to index by paint_index
    const skinsPath = path.join(dataDir, "skins.json");
    try {
      const skinsRaw = fs.readFileSync(skinsPath, "utf-8");
      const skins = JSON.parse(skinsRaw) as SkinSchema[];
      skins.forEach((skin) => {
        // Index by def_index
        const normalizedDefIndex = normalizeIndex(skin.def_index);
        if (normalizedDefIndex) {
          // If multiple skins share the same def_index (rare for base skins, but possible),
          // we usually want the base one or just any. For deterministic lookup, we just take the first one
          // or rely on paint_index for actual resolution.
          if (!this.skinsByDefIndex.has(normalizedDefIndex)) {
             this.skinsByDefIndex.set(normalizedDefIndex, skin);
          }
        }
        
        // Index by paint_index
        const normalizedPaintIndex = normalizeIndex(skin.paint_index);
        if (normalizedPaintIndex) {
          const items = this.itemsByPaintIndex.get(normalizedPaintIndex) ?? [];
          items.push(skin);
          this.itemsByPaintIndex.set(normalizedPaintIndex, items);
        }

        // Index by name (legacy support/search)
        this.indexByName(skin);
      });
    } catch (error) {
       console.warn("Failed to load skins.json:", error);
    }
  }

  private loadSpecificMap(
      filename: string, 
      targetMap: Map<string, SkinSchema>, 
      dataDir: string
  ) {
      const filePath = path.join(dataDir, filename);
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const items = JSON.parse(raw) as SkinSchema[];
        items.forEach((item) => {
          const normalizedDefIndex = normalizeIndex(item.def_index);
          if (normalizedDefIndex) {
            // For most categorical items, def_index is unique enough or we just take the first one
            // E.g. music kits might have duplicates for StatTrak, we take first.
            if (!targetMap.has(normalizedDefIndex)) {
              targetMap.set(normalizedDefIndex, item);
            }
          }
          
          // Index by paint_index if present
          const normalizedPaintIndex = normalizeIndex(item.paint_index);
          if (normalizedPaintIndex) {
            const items = this.itemsByPaintIndex.get(normalizedPaintIndex) ?? [];
            items.push(item);
            this.itemsByPaintIndex.set(normalizedPaintIndex, items);
          }

          // Index by name for search/legacy
          this.indexByName(item);
        });
      } catch (error) {
        console.warn(`Failed to load ${filename}:`, error);
      }
  }

  private indexByName(item: SkinSchema) {
    if (item.name) {
      this.itemsByName.set(item.name, item);
    }
    if (item.market_hash_name && item.market_hash_name !== item.name) {
      this.itemsByName.set(item.market_hash_name, item);
    }
    if (item.original?.item_name) {
        // Only if we really need original names map, but let's keep it simple for now and NOT index them unless requested.
        // The previous code indexed them. Let's start with clean maps.
        // If we need them, we can add them back.
    }
  }

  getByName(name: string): SkinSchema | null {
    return this.itemsByName.get(name) ?? null;
  }

  getHighlightByDefIndex(defIndex: string | number): SkinSchema | null {
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return null;
    }
    return this.highlightsByDefIndex.get(normalizedDefIndex) ?? null;
  }

  getSlabByDefIndex(defIndex: string | number): SkinSchema | null {
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return null;
    }
    return this.slabsByDefIndex.get(normalizedDefIndex) ?? null;
  }

  getToolByDefIndex(defIndex: string | number): SkinSchema | null {
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return null;
    }
    return this.toolsByDefIndex.get(normalizedDefIndex) ?? null;
  }

  getStickerByDefIndex(defIndex: string | number): SkinSchema | null {
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return null;
    }
    return this.stickersByDefIndex.get(normalizedDefIndex) ?? null;
  }

  getKeychainByDefIndex(defIndex: string | number): SkinSchema | null {
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return null;
    }
    return this.keychainsByDefIndex.get(normalizedDefIndex) ?? null;
  }

  getMusicKitByDefIndex(defIndex: string | number): SkinSchema | null {
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return null;
    }
    return this.musicKitsByDefIndex.get(normalizedDefIndex) ?? null;
  }

  getAgentByDefIndex(defIndex: string | number): SkinSchema | null {
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return null;
    }
    return this.agentsByDefIndex.get(normalizedDefIndex) ?? null;
  }

  getCrateByDefIndex(defIndex: string | number): SkinSchema | null {
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return null;
    }
    return this.cratesByDefIndex.get(normalizedDefIndex) ?? null;
  }

  getPatchByDefIndex(defIndex: string | number): SkinSchema | null {
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return null;
    }
    return this.patchesByDefIndex.get(normalizedDefIndex) ?? null;
  }

  getCollectibleByDefIndex(defIndex: string | number): SkinSchema | null {
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return null;
    }
    return this.collectiblesByDefIndex.get(normalizedDefIndex) ?? null;
  }

  getGraffitiByDefIndex(defIndex: string | number): SkinSchema | null {
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return null;
    }
    return this.graffitiByDefIndex.get(normalizedDefIndex) ?? null;
  }

  getSkinByDefIndex(defIndex: string | number): SkinSchema | null {
      const normalizedDefIndex = normalizeIndex(defIndex);
      if (!normalizedDefIndex) {
        return null;
      }
      return this.skinsByDefIndex.get(normalizedDefIndex) ?? null;
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
    // New logic: lookup in graffitiByDefIndex
    const basicGraffiti = this.graffitiByDefIndex.get(normalizedKitId);
    if (basicGraffiti) {
        return basicGraffiti;
    }
    // Fallback: Use new generic skin/defIndex lookup if needed, but graffiti map should cover it.
    // The previous logic used itemsByDefIndexList which allowed finding graffiti even if defIndex collided.
    // Now we have strict separation.
    
    // However, Graffiti tints are often handled by "graffiti-ID_TintID" or similar variations?
    // Looking at graffiti.json, they just have def_index. The tint is applied on top.
    // Checks service.ts: getGraffitiByKitAndTint was matching id prefixes.
    // But graffiti.json only has base definitions?
    // Let's return the base graffiti from our map.
    return this.graffitiByDefIndex.get(normalizedKitId) ?? null;
  }

  getByOriginalItemName(
    itemName: string,
    defIndex?: string | number | null
  ): SkinSchema | null {
    return this.findByOriginalKey(this.itemsByName, itemName, defIndex);
  }

  getByOriginalLocName(
    locName: string,
    defIndex?: string | number | null
  ): SkinSchema | null {
    return this.findByOriginalKey(this.itemsByName, locName, defIndex);
  }

  getByOriginalName(
    originalName: string,
    defIndex?: string | number | null
  ): SkinSchema | null {
    return this.findByOriginalKey(this.itemsByName, originalName, defIndex);
  }

  private findByOriginalKey(
    map: Map<string, SkinSchema>,
    key: string,
    defIndex?: string | number | null
  ): SkinSchema | null {
    const item = map.get(key);
    if (!item) {
      return null;
    }
    if (defIndex === undefined || defIndex === null) {
      return item;
    }
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return item;
    }
    // Strict check: if defIndex provided, it must match
    if (normalizeIndex(item.def_index) === normalizedDefIndex) {
      return item;
    }
    return null;
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


