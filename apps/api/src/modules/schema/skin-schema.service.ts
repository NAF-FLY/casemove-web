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
  name?: string | null;
  loc_name?: string | null;
  image_inventory?: string | null;
};

export type SkinSchemaWeapon = {
  id: string;
  name: string;
  weapon_id?: number | null;
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
  original?: SkinSchemaOriginal | null;
};

export class SkinSchemaService {
  private itemsByName = new Map<string, SkinSchema>();
  private itemsByDefIndex = new Map<string, SkinSchema>();
  private itemsByPaintIndex = new Map<string, SkinSchema>();

  async init(): Promise<void> {
    const cwdPath = path.join(process.cwd(), "src/data/items/items.json");
    const rootPath = path.join(
      process.cwd(),
      "apps/api/src/data/items/items.json"
    );
    const filePath = fs.existsSync(cwdPath) ? cwdPath : rootPath;
    const raw = fs.readFileSync(filePath, "utf-8");
    const items = JSON.parse(raw) as Record<string, SkinSchema>;

    Object.values(items).forEach((item) => {
      this.itemsByName.set(item.name, item);
      if (item.market_hash_name && item.market_hash_name !== item.name) {
        this.itemsByName.set(item.market_hash_name, item);
      }
      const normalizedDefIndex = normalizeIndex(item.def_index);
      if (normalizedDefIndex) {
        this.itemsByDefIndex.set(normalizedDefIndex, item);
      }
      const normalizedPaintIndex = normalizeIndex(item.paint_index);
      if (normalizedPaintIndex) {
        this.itemsByPaintIndex.set(normalizedPaintIndex, item);
      }
    });
  }

  getByName(name: string): SkinSchema | null {
    return this.itemsByName.get(name) ?? null;
  }

  getByDefIndex(defIndex: string | number): SkinSchema | null {
    const normalizedDefIndex = normalizeIndex(defIndex);
    if (!normalizedDefIndex) {
      return null;
    }
    return this.itemsByDefIndex.get(normalizedDefIndex) ?? null;
  }

  getByPaintIndex(paintIndex: string | number): SkinSchema | null {
    const normalizedPaintIndex = normalizeIndex(paintIndex);
    if (!normalizedPaintIndex) {
      return null;
    }
    return this.itemsByPaintIndex.get(normalizedPaintIndex) ?? null;
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
