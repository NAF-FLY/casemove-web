import type { ISteamClient, SteamCredentials } from "./steam-client";
import { SteamClient } from "./steam-client";

export interface ISteamManager {
  connect(
    userId: string,
    steamAccountId: string,
    credentials: SteamCredentials
  ): Promise<ISteamClient>;
  getClient(userId: string, steamAccountId: string): ISteamClient;
  getActiveClient(userId: string): ISteamClient;
  hasClient(userId: string, steamAccountId: string): boolean;
  hasActiveClient(userId: string): boolean;
  getActiveAccountId(userId: string): string;
  setActiveAccount(userId: string, steamAccountId: string): void;
  disconnect(userId: string, steamAccountId: string): void;
  disconnectAllForUser(userId: string): void;
}

export class SteamManager implements ISteamManager {
  private clients = new Map<string, Map<string, SteamClient>>();
  private activeAccountIdByUser = new Map<string, string>();

  private getUserClients(userId: string): Map<string, SteamClient> {
    const existing = this.clients.get(userId);
    if (existing) {
      return existing;
    }

    const created = new Map<string, SteamClient>();
    this.clients.set(userId, created);
    return created;
  }

  async connect(
    userId: string,
    steamAccountId: string,
    credentials: SteamCredentials,
    onRefreshToken?: (token: string) => void
  ): Promise<ISteamClient> {
    const userClients = this.getUserClients(userId);
    const existingClient = userClients.get(steamAccountId);

    if (existingClient) {
      return existingClient;
    }

    const client = new SteamClient();
    
    // Set callback BEFORE login so we capture the refreshToken event
    if (onRefreshToken) {
      client.setRefreshTokenCallback(onRefreshToken);
    }
    
    await client.login(credentials);
    userClients.set(steamAccountId, client);

    if (!this.activeAccountIdByUser.has(userId)) {
      this.activeAccountIdByUser.set(userId, steamAccountId);
    }

    return client;
  }

  getClient(userId: string, steamAccountId: string): ISteamClient {
    const userClients = this.clients.get(userId);
    const client = userClients?.get(steamAccountId);

    if (!client) {
      throw new Error("Steam client not initialized");
    }

    return client;
  }

  getActiveClient(userId: string): ISteamClient {
    const activeAccountId = this.activeAccountIdByUser.get(userId);

    if (!activeAccountId) {
      throw new Error("Steam client not initialized");
    }

    return this.getClient(userId, activeAccountId);
  }

  hasClient(userId: string, steamAccountId: string): boolean {
    return this.clients.get(userId)?.has(steamAccountId) ?? false;
  }

  hasActiveClient(userId: string): boolean {
    const activeAccountId = this.activeAccountIdByUser.get(userId);
    if (!activeAccountId) {
      return false;
    }

    return this.hasClient(userId, activeAccountId);
  }

  getActiveAccountId(userId: string): string {
    const activeAccountId = this.activeAccountIdByUser.get(userId);
    if (!activeAccountId) {
      throw new Error("No active Steam account");
    }
    return activeAccountId;
  }

  setActiveAccount(userId: string, steamAccountId: string): void {
    if (!this.hasClient(userId, steamAccountId)) {
      throw new Error("Steam client not initialized");
    }

    this.activeAccountIdByUser.set(userId, steamAccountId);
  }

  disconnect(userId: string, steamAccountId: string): void {
    const userClients = this.clients.get(userId);
    const client = userClients?.get(steamAccountId);

    if (!client) {
      return;
    }

    client.logOff();
    userClients?.delete(steamAccountId);

    if (userClients && userClients.size === 0) {
      this.clients.delete(userId);
    }

    if (this.activeAccountIdByUser.get(userId) === steamAccountId) {
      this.activeAccountIdByUser.delete(userId);
    }
  }

  disconnectAllForUser(userId: string): void {
    const userClients = this.clients.get(userId);

    if (!userClients) {
      return;
    }

    for (const client of userClients.values()) {
      client.logOff();
    }

    this.clients.delete(userId);
    this.activeAccountIdByUser.delete(userId);
  }
}

export const steamManager = new SteamManager();
