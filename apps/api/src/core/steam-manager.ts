import type { ISteamClient, SteamCredentials } from "./steam-client";
import { SteamClient } from "./steam-client";

export interface ISteamManager {
  getClient(): ISteamClient;
  init(credentials: SteamCredentials): Promise<ISteamClient>;
  logout(): void;
}

export class SteamManager implements ISteamManager {
  private client: SteamClient | null = null;

  async init(credentials: SteamCredentials): Promise<ISteamClient> {
    if (this.client) {
      return this.client;
    }

    const client = new SteamClient();
    await client.login(credentials);
    this.client = client;
    return client;
  }

  getClient(): ISteamClient {
    if (!this.client) {
      throw new Error("Steam client not initialized");
    }

    return this.client;
  }

  logout(): void {
    if (this.client) {
      this.client.logOff();
      this.client = null;
    }
  }
}

export const steamManager = new SteamManager();
