import type {
  InventoryItemDTO,
  InventoryItemSchemaDTO,
  StorageUnitDTO
} from "@casemove/shared-types";
import type { EventEmitter } from "node:events";
import util from "node:util";
import GlobalOffensive from "globaloffensive";
import SteamUser from "steam-user";

import { skinSchemaService } from "../modules/schema/skin-schema.service";
export type SteamCredentials = {
  username: string;
  password: string;
  twoFactorCode?: string;
};

export type MoveItemsPayload = {
  from: "inventory" | "storage";
  to: "inventory" | "storage";
  storageId?: string;
  itemIds: string[];
};

export interface ISteamClient {
  login(credentials: SteamCredentials): Promise<void>;
  logOff(): void;
  getInventory(): Promise<InventoryItemDTO[]>;
  getStorageUnits(): Promise<StorageUnitDTO[]>;
  getStorageItems(storageId: string): Promise<InventoryItemDTO[]>;
  moveItems(payload: MoveItemsPayload): Promise<void>;
  getPersonaName(): string | null;
}

export class SteamClient implements ISteamClient {
  private client: SteamUser;
  private gc!: GlobalOffensive;
  private ready = false;
  private gcReady = false;
  private itemSchema: CsgItemSchema | null = null;
  private itemSchemaPromise: Promise<void> | null = null;
  private itemSchemaByDefIndex: Map<string, CsgItemSchemaItem> | null = null;
  private personaName: string | null = null;
  private webSessionId: string | null = null;
  private webCookies: string[] = [];

  constructor() {
    this.client = new SteamUser();
    this.client.on("webSession", (sessionId, cookies) => {
      this.webSessionId = sessionId;
      this.webCookies = cookies.map((cookie) => cookie.split(";")[0]);
    });
  }

  async login(credentials: SteamCredentials): Promise<void> {
    const logOnPromise = this.waitForLogOn(credentials);
    const logOnDetails: SteamUser.LogOnDetailsNamePass = {
      accountName: credentials.username,
      password: credentials.password
    };

    this.client.logOn(logOnDetails);

    await logOnPromise;
    this.ready = true;
    this.personaName = await this.resolvePersonaName();

    this.gc = new GlobalOffensive(this.client);
    this.gc.once("connectedToGC", () => {
      this.gcReady = true;
      void this.ensureItemSchema();
    });
    this.client.gamesPlayed([730]);
  }

  logOff(): void {
    this.client.logOff();
    this.ready = false;
    this.gcReady = false;
    this.itemSchema = null;
    this.itemSchemaPromise = null;
    this.itemSchemaByDefIndex = null;
    this.personaName = null;
    this.webSessionId = null;
    this.webCookies = [];
  }

  async getInventory(): Promise<InventoryItemDTO[]> {
    if (!this.ready) {
      throw new Error("Steam client not ready");
    }

    const steamId = this.client.steamID;
    if (!steamId) {
      throw new Error("No SteamID, user is not logged in");
    }
    const steamIdValue: NonNullable<SteamUser["steamID"]> = steamId;

    const client = this.client as SteamUser & {
      getUserInventoryContents?: (
        steamId: SteamUser["steamID"],
        appId: number,
        contextId: number,
        tradableOnly: boolean,
        callback: (err: Error | null, items: SteamInventoryItem[]) => void
      ) => void;
    };

    let rawItems: SteamInventoryItem[];

    try {
      rawItems = await this.fetchCommunityInventory(steamIdValue);
    } catch (error) {
      console.warn("Steam Community inventory failed, falling back to GC", error);
      if (typeof client.getUserInventoryContents === "function") {
        rawItems = await new Promise<SteamInventoryItem[]>((resolve, reject) => {
          client.getUserInventoryContents?.(steamIdValue, 730, 2, true, (err, items) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(items ?? []);
          });
        });
      } else {
        rawItems = await this.waitForGcInventory();
      }
    }

    console.log(
      "Steam raw inventory items (unmapped)",
      util.inspect(rawItems, { depth: null, maxArrayLength: 50, breakLength: 120 })
    );
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
      if (this.isHiddenGcItem(item)) {
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
      "Steam GC hidden items filtered",
      util.inspect(
        {
          rawCount: rawItems.length,
          hiddenCount: hiddenItems.length,
          hiddenItems,
          visibleCount: visibleItems.length
        },
        { depth: null, maxArrayLength: 200, breakLength: 120 }
      )
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

    const slotGroups = new Map<string, SteamInventoryItem[]>();
    for (const item of dedupedItems) {
      const key = `${String(item.inventory ?? "null")}:${String(item.position ?? "null")}`;
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
    const resolvedItems: SteamInventoryItem[] = [];

    for (const [slot, items] of slotGroups.entries()) {
      if (items.length === 1) {
        resolvedItems.push(items[0]);
        continue;
      }

      let bestItem = items[0];
      let bestScore = -1;
      let bestReason = "default";

      const candidates = items.map((item) => {
        const { score, reason } = this.getSlotCollisionScore(item);
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
      "Steam GC slot collisions resolved",
      util.inspect(
        {
          collisionCount: collisionDetails.length,
          slots: collisionDetails.map((detail) => detail.slot),
          collisions: collisionDetails
        },
        { depth: null, maxArrayLength: 200, breakLength: 120 }
      )
    );
    await this.ensureItemSchema();
    return resolvedItems.map((item) => this.mapSteamItemToDTO(item));
  }

  async getStorageUnits(): Promise<StorageUnitDTO[]> {
    throw new Error("Not implemented");
  }

  async getStorageItems(_: string): Promise<InventoryItemDTO[]> {
    throw new Error("Not implemented");
  }

  async moveItems(_: MoveItemsPayload): Promise<void> {
    throw new Error("Not implemented");
  }

  getPersonaName(): string | null {
    return this.personaName ?? this.client.accountInfo?.name ?? null;
  }

  private resolvePersonaName(): Promise<string | null> {
    if (this.client.accountInfo?.name) {
      return Promise.resolve(this.client.accountInfo.name);
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve(this.client.accountInfo?.name ?? null);
      }, 5000);
      const handleAccountInfo = (name: string) => {
        cleanup();
        resolve(name);
      };
      const cleanup = () => {
        clearTimeout(timeoutId);
        this.client.removeListener("accountInfo", handleAccountInfo);
      };

      this.client.on("accountInfo", handleAccountInfo);
    });
  }

  private async ensureWebSession(): Promise<void> {
    if (this.webCookies.length > 0) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Steam web session not ready"));
      }, 10000);

      const handleWebSession = () => {
        cleanup();
        resolve();
      };
      const handleError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        clearTimeout(timeoutId);
        this.client.removeListener("webSession", handleWebSession);
        this.client.removeListener("error", handleError);
      };

      this.client.once("webSession", handleWebSession);
      this.client.once("error", handleError);
      this.client.webLogOn();
    });
  }

  private async fetchCommunityInventory(
    steamId: NonNullable<SteamUser["steamID"]>
  ): Promise<SteamInventoryItem[]> {
    await this.ensureWebSession();

    if (this.webCookies.length === 0) {
      throw new Error("Steam web session not available");
    }

    const steamId64 =
      typeof steamId === "string" ? steamId : steamId.getSteamID64();
    const assets: CommunityAsset[] = [];
    const descriptions: CommunityDescription[] = [];
    let startAssetId: string | undefined;

    while (true) {
      const url = new URL(
        `https://steamcommunity.com/inventory/${steamId64}/730/2`
      );
      url.searchParams.set("l", "english");
      url.searchParams.set("count", "5000");
      if (startAssetId) {
        url.searchParams.set("start_assetid", startAssetId);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Cookie: this.webCookies.join("; "),
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          Referer: `https://steamcommunity.com/profiles/${steamId64}/inventory`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to load inventory from Steam Community");
      }

      const data = (await response.json()) as CommunityInventoryResponse;
      if (!data.success) {
        const errorMessage =
          data.error ||
          (typeof data.success === "number"
            ? `Steam Community inventory error: ${data.success}`
            : "Steam Community inventory not available");
        throw new Error(errorMessage);
      }

      const pageAssets = data.assets ?? [];
      const pageDescriptions = data.descriptions ?? [];

      if (pageAssets.length > 0 && pageDescriptions.length === 0) {
        throw new Error("Steam Community inventory missing descriptions");
      }

      assets.push(...pageAssets);
      descriptions.push(...pageDescriptions);

      if (!data.more_items || !data.last_assetid) {
        break;
      }

      startAssetId = data.last_assetid;
    }

    const descriptionMap = new Map<string, CommunityDescription>();
    for (const description of descriptions) {
      const instanceId = description.instanceid ?? "0";
      descriptionMap.set(
        `${description.classid}_${instanceId}`,
        description
      );
    }

    return assets.map((asset) => {
      const instanceId = asset.instanceid ?? "0";
      const description = descriptionMap.get(
        `${asset.classid}_${instanceId}`
      );

      return {
        id: asset.assetid,
        assetid: asset.assetid,
        market_hash_name: description?.market_hash_name,
        name: description?.name,
        type: description?.type,
        icon_url: description?.icon_url,
        tradable: description?.tradable,
        tags: description?.tags
      };
    });
  }

  private waitForEvent(emitter: EventEmitter, event: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const handleEvent = () => {
        cleanup();
        resolve();
      };
      const handleError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        emitter.removeListener(event, handleEvent);
        emitter.removeListener("error", handleError);
      };

      emitter.once(event, handleEvent);
      emitter.once("error", handleError);
    });
  }

  private waitForLogOn(credentials: SteamCredentials): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        if (credentials.twoFactorCode) {
          reject(new Error("Steam login failed"));
        } else {
          reject(new Error("Steam Guard required"));
        }
      }, 15000);
      const handleLoggedOn = () => {
        cleanup();
        resolve();
      };
      const handleError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const handleSteamGuard = (
        _domain: string | null,
        callback: (code: string) => void,
        lastCodeWrong: boolean
      ) => {
        if (lastCodeWrong) {
          cleanup();
          callback("");
          reject(new Error("Steam Guard code incorrect"));
          return;
        }

        if (credentials.twoFactorCode) {
          callback(credentials.twoFactorCode);
          return;
        }

        cleanup();
        callback("");
        reject(new Error("Steam Guard required"));
      };
      const cleanup = () => {
        clearTimeout(timeoutId);
        this.client.removeListener("loggedOn", handleLoggedOn);
        this.client.removeListener("error", handleError);
        this.client.removeListener("steamGuard", handleSteamGuard);
      };

      this.client.once("loggedOn", handleLoggedOn);
      this.client.once("error", handleError);
      this.client.on("steamGuard", handleSteamGuard);
    });
  }

  private waitForGcInventory(timeoutMs = 15000): Promise<SteamInventoryItem[]> {
    if (!this.gc) {
      return Promise.reject(new Error("Steam GC not initialized"));
    }

    if (this.gc.inventory) {
      return Promise.resolve(this.gc.inventory as SteamInventoryItem[]);
    }

    return new Promise((resolve, reject) => {
      if (this.gcReady) {
        resolve((this.gc.inventory ?? []) as SteamInventoryItem[]);
        return;
      }

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Steam GC inventory not ready"));
      }, timeoutMs);

      const handleConnected = () => {
        cleanup();
        resolve((this.gc.inventory ?? []) as SteamInventoryItem[]);
      };
      const handleDisconnected = () => {
        cleanup();
        reject(new Error("Steam GC disconnected"));
      };
      const cleanup = () => {
        clearTimeout(timeoutId);
        this.gc.removeListener("connectedToGC", handleConnected);
        this.gc.removeListener("disconnectedFromGC", handleDisconnected);
      };

      this.gc.once("connectedToGC", handleConnected);
      this.gc.once("disconnectedFromGC", handleDisconnected);
    });
  }

  private async ensureItemSchema(timeoutMs = 5000): Promise<void> {
    if (this.itemSchema) {
      return;
    }

    const gc = this.gc as GlobalOffensiveWithSchema;
    if (typeof gc.getItemSchema !== "function") {
      return;
    }

    if (!this.itemSchemaPromise) {
      this.itemSchemaPromise = new Promise<void>((resolve) => {
        gc.getItemSchema?.((err, schema) => {
          if (err) {
            console.warn("Failed to load item schema", err);
            resolve();
            return;
          }
          this.itemSchema = schema;
          this.itemSchemaByDefIndex = null;
          resolve();
        });
      });
      void this.itemSchemaPromise.finally(() => {
        if (!this.itemSchema) {
          this.itemSchemaPromise = null;
        }
      });
    }

    await Promise.race([
      this.itemSchemaPromise,
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
    ]);
  }

  private getItemSchemaName(defIndex?: string | number): string | null {
    const schemaItem = this.getItemSchemaItem(defIndex);
    if (!schemaItem) {
      return null;
    }
    return (
      schemaItem?.market_hash_name ??
      schemaItem?.item_name ??
      schemaItem?.name ??
      null
    );
  }

  private getItemSchemaItem(
    defIndex?: string | number
  ): CsgItemSchemaItem | null {
    if (!this.itemSchema || defIndex === undefined || defIndex === null) {
      return null;
    }
    this.ensureItemSchemaIndex();
    if (!this.itemSchemaByDefIndex) {
      return null;
    }
    return this.itemSchemaByDefIndex.get(String(defIndex)) ?? null;
  }

  private ensureItemSchemaIndex(): void {
    if (this.itemSchemaByDefIndex || !this.itemSchema) {
      return;
    }
    const items = this.itemSchema.items;
    if (!items) {
      return;
    }
    const byDefIndex = new Map<string, CsgItemSchemaItem>();
    if (Array.isArray(items)) {
      items.forEach((item, index) => {
        const defIndex =
          item.def_index ?? item.defindex ?? item.defIndex ?? index;
        byDefIndex.set(String(defIndex), item);
      });
    } else {
      for (const key in items) {
        const item = items[key];
        if (item) {
          byDefIndex.set(String(key), item);
        }
      }
    }
    this.itemSchemaByDefIndex = byDefIndex;
  }

  private getWearName(paintWear?: number): string | null {
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

  private stripWearSuffix(name: string): string {
    const match = name.match(
      /^(.*)\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/
    );
    if (!match) {
      return name;
    }
    return match[1].trim();
  }

  private resolveSchemaItemByName(
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
      const stripped = this.stripWearSuffix(name);
      if (stripped !== name) {
        const strippedMatch = skinSchemaService.getByName(stripped);
        if (strippedMatch) {
          return strippedMatch;
        }
      }
      if (defIndex !== undefined && defIndex !== null) {
        if (name.startsWith("#")) {
          const byItemName = skinSchemaService.getByOriginalItemName(
            name,
            defIndex
          );
          if (byItemName) {
            return byItemName;
          }
          const byLocName = skinSchemaService.getByOriginalLocName(
            name,
            defIndex
          );
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

  private getItemTypeHint(
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

  private getAttributeIntValue(
    rawItem: SteamInventoryItem,
    defIndex: number
  ): number | null {
    const attributes = rawItem.attribute ?? [];
    const attribute = attributes.find((entry) => entry.def_index === defIndex);
    if (!attribute) {
      return null;
    }
    if (typeof attribute.value === "number" && Number.isFinite(attribute.value)) {
      return Math.trunc(attribute.value);
    }
    if (attribute.value_bytes && attribute.value_bytes.length >= 4) {
      return attribute.value_bytes.readUInt32LE(0);
    }
    if (typeof attribute.value_string === "string") {
      const parsed = Number(attribute.value_string);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
    }
    return null;
  }

  private getAttributeUInt32Value(
    rawItem: SteamInventoryItem,
    defIndex: number
  ): number | null {
    const attributes = rawItem.attribute ?? [];
    const attribute = attributes.find((entry) => entry.def_index === defIndex);
    if (!attribute) {
      return null;
    }
    if (attribute.value_bytes && attribute.value_bytes.length >= 4) {
      return attribute.value_bytes.readUInt32LE(0);
    }
    if (typeof attribute.value === "number" && Number.isFinite(attribute.value)) {
      return Math.trunc(attribute.value);
    }
    if (typeof attribute.value_string === "string") {
      const parsed = Number(attribute.value_string);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
    }
    return null;
  }

  private getStickerKitId(rawItem: SteamInventoryItem): number | null {
    const stickerId = rawItem.stickers?.[0]?.sticker_id;
    if (typeof stickerId === "number" && Number.isFinite(stickerId)) {
      return stickerId;
    }
    return this.getAttributeIntValue(rawItem, 113);
  }

  private getGraffitiTintId(rawItem: SteamInventoryItem): number | null {
    const tint = this.getAttributeIntValue(rawItem, 233) ?? this.getAttributeIntValue(rawItem, 232);
    if (tint === null) {
      return null;
    }
    if (tint < 0 || tint > 19) {
      return null;
    }
    return tint;
  }

  private shouldResolveGraffitiFromStickerBranch(
    rawItem: SteamInventoryItem
  ): boolean {
    const defIndex = Number(rawItem.def_index);
    if (defIndex !== 1348 && defIndex !== 1349) {
      return false;
    }
    if (typeof rawItem.paint_wear === "number" && Number.isFinite(rawItem.paint_wear)) {
      return false;
    }
    return true;
  }

  private isMusicKitBaseItem(
    rawItem: SteamInventoryItem,
    schemaItem: CsgItemSchemaItem | null
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

  private matchesTypeHint(
    item: ReturnType<typeof skinSchemaService.getByName> | null,
    typeHint: string | null
  ): boolean {
    if (!item || !typeHint) {
      return false;
    }
    if (typeHint.includes("graffiti") || typeHint.includes("spray")) {
      return item.id.startsWith("graffiti-");
    }
    if (typeHint.includes("music kit") || typeHint.includes("musickit")) {
      return item.id.startsWith("music_kit-");
    }
    if (typeHint.includes("sticker")) {
      return item.id.startsWith("sticker-") || item.id.startsWith("sticker_slab-");
    }
    if (
      typeHint.includes("case") ||
      typeHint.includes("container") ||
      typeHint.includes("capsule") ||
      typeHint.includes("package") ||
      typeHint.includes("crate")
    ) {
      return item.id.startsWith("crate-");
    }
    return false;
  }

  private getNumericDefIndex(
    defIndex: string | number | null | undefined
  ): number | null {
    if (defIndex === null || defIndex === undefined) {
      return null;
    }
    const numeric = Number(defIndex);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private getSchemaItemPriority(
    item: ReturnType<typeof skinSchemaService.getByName> | null
  ): number {
    if (!item) {
      return 0;
    }
    const id = item.id.toLowerCase();
    if (id.startsWith("music_kit-") || id.startsWith("music-kit-")) {
      return 50;
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
      id.startsWith("patch-") ||
      id.startsWith("keychain-")
    ) {
      return 40;
    }
    if (id.startsWith("sticker-") || id.startsWith("sticker_slab-")) {
      return 10;
    }
    if (id.startsWith("graffiti-")) {
      return 10;
    }
    return 20;
  }

  private mapSteamItemToDTO(rawItem: SteamInventoryItem): InventoryItemDTO {
    const defIndex = rawItem.def_index;
    const paintIndex = rawItem.paint_index;
    const wearName = this.getWearName(rawItem.paint_wear);
    const hasPaintWear =
      typeof rawItem.paint_wear === "number" &&
      Number.isFinite(rawItem.paint_wear);
    const schemaItem = this.getItemSchemaItem(defIndex);
    const schemaName = this.getItemSchemaName(defIndex);
    const rawName = rawItem.market_hash_name ?? rawItem.name ?? null;
    const typeHint = this.getItemTypeHint(rawItem, rawName);
    const nameLookupItem = this.resolveSchemaItemByName(defIndex, rawName, schemaName);
    const stickerBranchAllowed = this.shouldResolveGraffitiFromStickerBranch(rawItem);
    const stickerKitId = this.getStickerKitId(rawItem);
    const graffitiTintId = this.getGraffitiTintId(rawItem);
    const graffitiKitId =
      stickerKitId ??
      (graffitiTintId !== null ? this.getNumericDefIndex(defIndex) : null);
    const hasGraffitiAttributes = graffitiTintId !== null && graffitiKitId !== null;
    const graffitiItem = hasGraffitiAttributes
      ? skinSchemaService.getGraffitiByKitAndTint(graffitiKitId, graffitiTintId)
      : null;
    const stickerBranchTriggered = stickerBranchAllowed && stickerKitId !== null;
    const musicKitId = this.isMusicKitBaseItem(rawItem, schemaItem)
      ? this.getAttributeUInt32Value(rawItem, 166)
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
      const namePriority = this.getSchemaItemPriority(nameLookupItem);
      const defPriority = this.getSchemaItemPriority(defIndexItem);
      if (defPriority > namePriority) {
        baseItem = defIndexItem;
      } else if (namePriority > defPriority) {
        baseItem = nameLookupItem;
      }
    }
    if (
      this.matchesTypeHint(nameLookupItem, typeHint) &&
      !this.matchesTypeHint(defIndexItem, typeHint)
    ) {
      baseItem = nameLookupItem;
    } else if (
      this.matchesTypeHint(defIndexItem, typeHint) &&
      !this.matchesTypeHint(nameLookupItem, typeHint)
    ) {
      baseItem = defIndexItem;
    }

    let marketHashName: string;
    if (skinItem) {
      const baseName = this.stripWearSuffix(skinItem.name);
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

    if (
      marketHashName.includes("Sticker |") ||
      defIndexItem?.id.startsWith("music-kit-") ||
      defIndexItem?.id.startsWith("music_kit-")
    ) {
      const attr113 = this.getAttributeUInt32Value(rawItem, 113);
      console.log(
        "Steam GC mapping debug",
        util.inspect(
          {
            itemId: String(rawItem.id ?? rawItem.assetid ?? ""),
            def_index: defIndex ?? null,
            baseFromDefIndex: defIndexItem
              ? { id: defIndexItem.id, name: defIndexItem.name }
              : null,
            stickerBranchTriggered,
            sticker_id: rawItem.stickers?.[0]?.sticker_id ?? null,
            attr113,
            graffitiTintId,
            graffitiKitId,
            musicKitId,
            musicKitItem: musicKitItem
              ? { id: musicKitItem.id, name: musicKitItem.name }
              : null,
            finalName: marketHashName
          },
          { depth: null, maxArrayLength: 50, breakLength: 120 }
        )
      );
    }

    return {
      id: String(rawItem.id ?? rawItem.assetid ?? ""),
      appId: 730,
      marketHashName,
      iconUrl: rawItem.icon_url ?? rawItem.icon ?? null,
      moveable: Boolean(rawItem.item_moveable ?? rawItem.marketable ?? true),
      tradable: Boolean(rawItem.tradable ?? true),
      schema: schemaDto
    };
  }

  private isHiddenGcItem(rawItem: SteamInventoryItem): boolean {
    const inventory = Number(rawItem.inventory);
    const flags = Number(rawItem.flags);
    const origin = Number(rawItem.origin);
    const position = Number(rawItem.position);
    return (
      inventory === 3221225477 &&
      flags === 24 &&
      origin === 8 &&
      position === 0
    );
  }

  private getSlotCollisionScore(rawItem: SteamInventoryItem): {
    score: number;
    reason: string;
  } {
    const defIndex = Number(rawItem.def_index);
    const stickerKitId = this.getStickerKitId(rawItem);
    const graffitiTintId = this.getGraffitiTintId(rawItem);
    if (
      (defIndex === 1348 || defIndex === 1349) &&
      stickerKitId !== null &&
      graffitiTintId !== null
    ) {
      return { score: 4, reason: "graffiti_container_with_tint" };
    }
    if (typeof rawItem.paint_wear === "number" && Number.isFinite(rawItem.paint_wear)) {
      return { score: 3, reason: "weapon_skin_paint_wear" };
    }
    if (
      (defIndex === 1348 || defIndex === 1349) &&
      stickerKitId !== null
    ) {
      return { score: 2, reason: "graffiti_container_sticker_id" };
    }
    return { score: 1, reason: "default" };
  }
}

type CsgItemSchema = {
  items?: Record<string, CsgItemSchemaItem> | CsgItemSchemaItem[];
};

type CsgItemSchemaItem = {
  def_index?: string | number;
  defindex?: string | number;
  defIndex?: string | number;
  name?: string;
  item_name?: string;
  item_type_name?: string;
  market_hash_name?: string;
};

type GlobalOffensiveWithSchema = GlobalOffensive & {
  getItemSchema?: (
    callback: (err: Error | null, schema: CsgItemSchema) => void
  ) => void;
};

type SteamInventoryItem = {
  id?: string | number;
  assetid?: string | number;
  inventory?: number;
  def_index?: string | number;
  paint_index?: number;
  paint_seed?: number;
  paint_wear?: number;
  market_hash_name?: string;
  name?: string;
  type?: string;
  icon_url?: string;
  icon?: string;
  item_moveable?: boolean | number;
  marketable?: boolean | number;
  tradable?: boolean | number;
  flags?: number;
  origin?: number;
  position?: number;
  tags?: Array<{ category?: string; name?: string }>;
  attribute?: Array<{
    def_index: number;
    value?: number | null;
    value_bytes?: Buffer;
    value_string?: string | null;
  }>;
  stickers?: Array<{
    slot?: number;
    sticker_id?: number;
    wear?: number | null;
    scale?: number | null;
    rotation?: number | null;
    offset_x?: number | null;
    offset_y?: number | null;
  }>;
};

type CommunityInventoryResponse = {
  success: number;
  error?: string;
  assets?: CommunityAsset[];
  descriptions?: CommunityDescription[];
  more_items?: number;
  last_assetid?: string;
};

type CommunityAsset = {
  assetid: string;
  classid: string;
  instanceid?: string;
  amount: string;
};

type CommunityDescription = {
  classid: string;
  instanceid?: string;
  market_hash_name?: string;
  name?: string;
  type?: string;
  icon_url?: string;
  tradable?: number;
  tags?: Array<{ category?: string; name?: string }>;
};
