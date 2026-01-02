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
      rawItems = await this.fetchCommunityInventory(steamId);
    } catch (error) {
      console.warn("Steam Community inventory failed, falling back to GC", error);
      if (typeof client.getUserInventoryContents === "function") {
        rawItems = await new Promise<SteamInventoryItem[]>((resolve, reject) => {
          client.getUserInventoryContents?.(steamId, 730, 2, true, (err, items) => {
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
    await this.ensureItemSchema();
    return rawItems.map((item) => this.mapSteamItemToDTO(item));
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
    steamId: SteamUser["steamID"]
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
    if (!this.itemSchema || defIndex === undefined || defIndex === null) {
      return null;
    }
    const items = this.itemSchema.items;
    if (!items) {
      return null;
    }

    let schemaItem: CsgItemSchemaItem | undefined;
    if (Array.isArray(items)) {
      const index = Number(defIndex);
      if (Number.isInteger(index)) {
        schemaItem = items[index];
      }
    } else {
      schemaItem = items[String(defIndex)];
    }

    return (
      schemaItem?.item_name ??
      schemaItem?.name ??
      schemaItem?.market_hash_name ??
      null
    );
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

  private mapSteamItemToDTO(rawItem: SteamInventoryItem): InventoryItemDTO {
    const defIndex = rawItem.def_index;
    const paintIndex = rawItem.paint_index;
    const baseItem =
      defIndex !== undefined && defIndex !== null
        ? skinSchemaService.getByDefIndex(defIndex)
        : null;
    const skinItem =
      paintIndex !== undefined && paintIndex !== null
        ? skinSchemaService.getByPaintIndex(paintIndex)
        : null;
    const wearName = this.getWearName(rawItem.paint_wear);
    const rawName = rawItem.market_hash_name ?? rawItem.name ?? null;
    const nameLookupItem =
      (defIndex === undefined || defIndex === null) && rawName
        ? skinSchemaService.getByName(this.stripWearSuffix(rawName))
        : null;

    let marketHashName: string;
    if (skinItem) {
      marketHashName = wearName ? `${skinItem.name} (${wearName})` : skinItem.name;
    } else if (baseItem) {
      marketHashName = baseItem.name;
    } else if (defIndex !== undefined && defIndex !== null) {
      marketHashName = `Unknown item #${defIndex}`;
    } else if (rawName) {
      marketHashName = rawName;
    } else {
      marketHashName = "Unknown item";
    }

    const schemaSource = skinItem ?? baseItem ?? nameLookupItem;
    const image = skinItem?.image ?? baseItem?.image ?? nameLookupItem?.image ?? null;
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
}

type CsgItemSchema = {
  items?: Record<string, CsgItemSchemaItem> | CsgItemSchemaItem[];
};

type CsgItemSchemaItem = {
  name?: string;
  item_name?: string;
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
  tags?: Array<{ category?: string; name?: string }>;
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
