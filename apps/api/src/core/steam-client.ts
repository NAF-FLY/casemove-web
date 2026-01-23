import type { StorageUnitDTO } from "@casemove/shared-types";
import GlobalOffensive from "globaloffensive";
import SteamCommunity from "steamcommunity";
import SteamUser from "steam-user";

export type SteamCredentials = {
  username: string;
  password?: string;
  twoFactorCode?: string;
  refreshToken?: string;
};

export type MoveItemsPayload = {
  from: "inventory" | "storage";
  to: "inventory" | "storage";
  storageId?: string;
  itemIds: string[];
};

export type SteamProfileData = {
  steamId: string;
  personaName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  tradeUrl: string | null;
  accountCreatedAt: Date | null;
};

export interface ISteamClient {
  login(credentials: SteamCredentials): Promise<void>;
  logOff(): void;
  getInventory(): Promise<SteamInventoryItem[]>;
  getInventoryViaCommunity(): Promise<SteamInventoryItem[]>;
  getStorageUnits(): Promise<StorageUnitDTO[]>;
  getStorageItems(storageId: string): Promise<SteamInventoryItem[]>;
  moveItems(payload: MoveItemsPayload): Promise<{ itemId: string; ok: boolean; error?: string }[]>;
  getPersonaName(): string | null;
  getProfileData(): Promise<SteamProfileData | null>;
  getTradeUrl(): Promise<{ url: string; token: string } | null>;
  loadItemSchema(timeoutMs?: number): Promise<void>;
  getItemSchemaName(defIndex?: string | number): string | null;
  getItemSchemaItem(defIndex?: string | number): CsgItemSchemaItem | null;
  setRefreshTokenCallback(callback: (token: string) => void): void;
}

export class SteamClient implements ISteamClient {
  private client: SteamUser;
  private gc!: GlobalOffensive;
  private community: SteamCommunity;
  private ready = false;
  private gcReady = false;
  private webSessionReady = false;
  private itemSchema: CsgItemSchema | null = null;
  private itemSchemaPromise: Promise<void> | null = null;
  private itemSchemaByDefIndex: Map<string, CsgItemSchemaItem> | null = null;
  private personaName: string | null = null;
  private onRefreshToken?: (token: string) => void;
  // Serialize GC actions to avoid overlapping requests (GC is sensitive to concurrency)
  private gcQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.client = new SteamUser();
    this.client.on("error", (err) => {
      console.warn("SteamUser global error:", err.message);
    });
    this.community = new SteamCommunity();
    this.gc = new GlobalOffensive(this.client);
    
    this.gc.on("connectedToGC", () => {
      this.gcReady = true;
      void this.loadItemSchema();
    });

    this.gc.on("disconnectedFromGC", () => {
      this.gcReady = false;
    });

  }

  setRefreshTokenCallback(callback: (token: string) => void): void {
    this.onRefreshToken = callback;
  }

  async login(credentials: SteamCredentials): Promise<void> {
    const logOnPromise = this.waitForLogOn(credentials);

    // Handle refresh token event - call callback when token is received
    this.client.on("refreshToken", (token: string) => {
      if (this.onRefreshToken) {
        this.onRefreshToken(token);
      }
    });

    // Use refresh token if available, otherwise use password
    if (credentials.refreshToken) {
      this.client.logOn({ refreshToken: credentials.refreshToken });
    } else if (credentials.password) {
      const logOnDetails: SteamUser.LogOnDetailsNamePass = {
        accountName: credentials.username,
        password: credentials.password
      };
      this.client.logOn(logOnDetails);
    } else {
      throw new Error("Either password or refreshToken is required");
    }

    await logOnPromise;
    this.ready = true;
    this.personaName = await this.resolvePersonaName();

    // Setup web session handler for Steam Community API
    this.client.on("webSession", (_sessionID, cookies) => {
      this.community.setCookies(cookies);
      this.webSessionReady = true;
      console.log("Steam web session ready");
    });

    // Request web session
    // Request web session
    this.client.webLogOn();

    this.client.gamesPlayed([730]);
  }

  logOff(): void {
    this.client.logOff();
    this.ready = false;
    this.gcReady = false;
    this.webSessionReady = false;
    this.itemSchema = null;
    this.itemSchemaPromise = null;
    this.itemSchemaByDefIndex = null;
    this.personaName = null;
    this.gcQueue = Promise.resolve(); // Reset GC queue
  }

  async getInventory(): Promise<SteamInventoryItem[]> {
    if (!this.ready) {
      throw new Error("Steam client not ready");
    }

    // Try GC inventory first (better data quality, e.g. floats)
    try {
      console.log("Fetching inventory via GC");
      return await this.waitForGcInventory(5000); // Increased timeout to 5s for better reliability
    } catch (err) {
      console.warn("GC inventory fetch failed/timed out, falling back to Steam Community API", err);
    }

    // Fallback/Alternative: Steam Community API
    if (this.webSessionReady) {
      try {
        console.log("Fetching inventory via Steam Community API");
        return await this.getInventoryViaCommunity();
      } catch (err) {
        console.warn("Steam Community inventory failed", err);
      }
    }
    
    throw new Error("Failed to fetch inventory (GC and Web both failed)");
  }

  async getInventoryViaCommunity(): Promise<SteamInventoryItem[]> {
    if (!this.webSessionReady) {
      throw new Error("Web session not ready");
    }

    const steamId = this.client.steamID;
    if (!steamId) {
      throw new Error("No SteamID, user is not logged in");
    }

    type InventoryCallback = (
      err: Error | null,
      inventory: SteamInventoryItem[]
    ) => void;

    return new Promise((resolve, reject) => {
      (this.community.getUserInventoryContents as (
        userID: typeof steamId,
        appID: number,
        contextID: number,
        tradableOnly: boolean,
        language: string,
        callback: InventoryCallback
      ) => void)(
        steamId,
        730,  // CS2 appId
        2,    // contextId
        false, // tradableOnly
        "english", // language
        (err, inventory) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(inventory ?? []);
        }
      );
    });
  }

  async getStorageUnits(): Promise<StorageUnitDTO[]> {
    throw new Error("Not implemented");
  }

  async getStorageItems(storageId: string): Promise<SteamInventoryItem[]> {
    return this.enqueueGcTask(async () => {
      await this.waitForGcReady(10000);
      // Re-check readiness inside the lock execution
      if (!this.gcReady || !this.gc) {
        throw new Error("Steam GC not ready");
      }

      return new Promise<SteamInventoryItem[]>((resolve, reject) => {
        const items: SteamInventoryItem[] = [];
        const timeoutMs = 30000; // 30 seconds timeout for large storages
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleItemAcquired = (item: any) => {
          if (item.casket_id === storageId) {
            items.push(item as SteamInventoryItem);
          }
        };
        
        const cleanup = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.gc as any).removeListener("itemAcquired", handleItemAcquired);
        };
        
        const timeoutId = setTimeout(() => {
          cleanup();
          if (items.length === 0) {
            console.error(`[Storage] Timeout reached for storage ${storageId}, failed to load items`);
            reject(new Error("Loading casket contents timed out"));
          } else {
            // Return whatever we collected so far
            console.log(`[Storage] Timeout reached for storage ${storageId}, returning ${items.length} partial items`);
            resolve(items);
          }

        }, timeoutMs);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.gc as any).on("itemAcquired", handleItemAcquired);

        
        // getCasketContents triggers itemAcquired events for each item
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.gc as any).getCasketContents(storageId, (err: Error | null) => {
          // If we already timed out or succeeded, do nothing (cleanup handled)
          // But we should clear timeout if it's still running
          // However, we rely on timeoutId closure. 
          // If we are here, it means the callback fired.
          
          // NOTE: We do NOT clear timeout immediately here because itemAcquired events 
          // might still be flowing in (async) even after callback if the lib behaves that way?
          // Actually, usually callback means "done". 
          // But for GlobalOffensive, itemAcquired fires DURING the process.
          // Correct flow: 
          // 1. Call getCasketContents
          // 2. itemAcquired fires N times
          // 3. Callback fires
          
          clearTimeout(timeoutId);
          cleanup();
          
          if (err) {
            console.error(`[Storage] Error fetching contents for ${storageId}:`, err);
            // Even if error, if we got some items, maybe resolve?
            // Usually error means "failed to start" or "disconnected".
            if (items.length > 0) {
               console.warn(`[Storage] Error but had ${items.length} items, returning partial.`);
               resolve(items);
            } else {
               reject(err);
            }
            return;
          }
          
          console.log(`[Storage] Loaded ${items.length} items from storage ${storageId}`);
          resolve(items);
        });
      });
    });
  }


  async moveItems(payload: MoveItemsPayload): Promise<{ itemId: string; ok: boolean; error?: string }[]> {
    if (payload.from !== "inventory" || payload.to !== "storage") {
      throw new Error("Only inventory -> storage transfers are supported");
    }

    if (!payload.storageId) {
      throw new Error("Storage ID is required");
    }

    if (!payload.itemIds.length) {
      return [];
    }

    const results: { itemId: string; ok: boolean; error?: string }[] = [];

    for (const itemId of payload.itemIds) {
      try {
        await this.enqueueGcTask(async () => {
          await this.waitForGcReady(10000);
          if (!this.gcReady || !this.gc) {
            throw new Error("Steam GC not ready");
          }

          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this.gc as any).addToCasket(payload.storageId, itemId);
          } catch (err) {
            throw err;
          }

          await this.waitForItemRemoved(itemId, 20000);
        });

        results.push({ itemId, ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to move item";
        results.push({ itemId, ok: false, error: message });
      }
    }

    return results;
  }

  getPersonaName(): string | null {
    return this.personaName ?? this.client.accountInfo?.name ?? null;
  }

  async getTradeUrl(): Promise<{ url: string; token: string } | null> {
    if (!this.webSessionReady) {
      console.warn("Web session not ready, cannot get trade URL");
      return null;
    }

    return new Promise((resolve) => {
      this.community.getTradeURL((err: Error | null, url: string, token: string) => {
        if (err) {
          console.warn("Failed to get trade URL:", err.message);
          resolve(null);
          return;
        }
        resolve({ url, token });
      });
    });
  }

  async getProfileData(): Promise<SteamProfileData | null> {
    const steamId = this.client.steamID;
    if (!steamId) {
      return null;
    }

    const steamId64 = steamId.getSteamID64();
    const personaName = this.getPersonaName();
    const profileUrl = `https://steamcommunity.com/profiles/${steamId64}`;

    // Try to get trade URL
    const tradeUrlData = await this.getTradeUrl();

    // Try to get extended profile data via steamcommunity
    let avatarUrl: string | null = null;
    let accountCreatedAt: Date | null = null;

    if (this.webSessionReady) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = await new Promise<any>((resolve, reject) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.community as any).getSteamUser(steamId, (err: any, result: any) => {
            if (err) reject(err);
            else resolve(result);
          });
        });

        if (user) {
          avatarUrl = user.getAvatarURL("full");
          accountCreatedAt = user.memberSince;
        }
      } catch (err) {
        console.warn("Failed to get extended profile data:", err);
      }
    }

    return {
      steamId: steamId64,
      personaName,
      avatarUrl,
      profileUrl,
      tradeUrl: tradeUrlData?.url ?? null,
      accountCreatedAt
    };
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

  private waitForGcReady(timeoutMs = 10000): Promise<void> {
    if (!this.gc) {
      return Promise.reject(new Error("Steam GC not initialized"));
    }

    if (this.gcReady) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Steam GC not ready"));
      }, timeoutMs);

      const handleConnected = () => {
        cleanup();
        resolve();
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

  private enqueueGcTask<T>(task: () => Promise<T>): Promise<T> {
    const execution = this.gcQueue.then(task);
    this.gcQueue = execution.then(() => undefined).catch(() => undefined);
    return execution;
  }

  private waitForItemRemoved(itemId: string, timeoutMs = 20000): Promise<void> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gc = this.gc as any;
      if (!gc) {
        reject(new Error("Steam GC not initialized"));
        return;
      }

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Timed out waiting for item removal"));
      }, timeoutMs);

      const handleRemoved = (item: { id?: string; assetid?: string }) => {
        const removedId = String(item?.id ?? item?.assetid ?? "");
        if (removedId === String(itemId)) {
          cleanup();
          resolve();
        }
      };

      const handleCustomization = (itemIds: string[] | undefined, notificationType: number) => {
        const casketAdded = (GlobalOffensive as typeof GlobalOffensive & {
          ItemCustomizationNotification?: { CasketAdded?: number };
        }).ItemCustomizationNotification?.CasketAdded;
        if (casketAdded !== undefined && notificationType === casketAdded) {
          if (Array.isArray(itemIds) && itemIds.some((id) => String(id) === String(itemId))) {
            cleanup();
            resolve();
          }
        }
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        gc.removeListener("itemRemoved", handleRemoved);
        gc.removeListener("itemCustomizationNotification", handleCustomization);
      };

      gc.on("itemRemoved", handleRemoved);
      gc.on("itemCustomizationNotification", handleCustomization);
    });
  }

  async loadItemSchema(timeoutMs = 5000): Promise<void> {
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

  getItemSchemaName(defIndex?: string | number): string | null {
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

  getItemSchemaItem(
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

}

type CsgItemSchema = {
  items?: Record<string, CsgItemSchemaItem> | CsgItemSchemaItem[];
};

export type CsgItemSchemaItem = {
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



export type SteamInventoryItem = {
  id?: string | number;
  assetid?: string | number;
  inventory?: number;
  def_index?: string | number;
  paint_index?: number;
  paint_seed?: number;
  paint_wear?: number;
  market_hash_name?: string;
  name?: string;
  custom_name?: string;
  type?: string;
  icon_url?: string;
  icon?: string;
  item_moveable?: boolean | number;
  marketable?: boolean | number;
  tradable?: boolean | number;
  casket_id?: string;
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
