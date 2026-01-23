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
  disconnectAllExcept(userId: string, steamAccountId: string): void;
}

export class SteamManager implements ISteamManager {
  private clients = new Map<string, Map<string, SteamClient>>();
  private activeAccountIdByUser = new Map<string, string>();
  // Fix: Map to store in-flight connection promises to prevent race conditions
  private connectionPromises = new Map<string, Promise<ISteamClient>>();

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

    // Check if there is already a connection in progress
    const connectionKey = `${userId}:${steamAccountId}`;
    const existingPromise = this.connectionPromises.get(connectionKey);
    if (existingPromise) {
      console.log(`Using existing connection promise for ${connectionKey}`);
      return existingPromise;
    }

    const connectPromise = (async () => {
      try {
        const client = new SteamClient();
        
        // Set callback BEFORE login so we capture the refreshToken event
        if (onRefreshToken) {
          client.setRefreshTokenCallback(onRefreshToken);
        }
        
        // Timeout wrapper for login
        const loginPromise = client.login(credentials);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Steam login timed out after 30s")), 30000)
        );
        
        await Promise.race([loginPromise, timeoutPromise]);
        userClients.set(steamAccountId, client);

        if (!this.activeAccountIdByUser.has(userId)) {
          this.activeAccountIdByUser.set(userId, steamAccountId);
        }

        return client;
      } finally {
        // Cleanup promise when done
        this.connectionPromises.delete(connectionKey);
      }
    })();

    this.connectionPromises.set(connectionKey, connectPromise);
    return connectPromise;
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

  disconnectAllExcept(userId: string, steamAccountId: string): void {
    const userClients = this.clients.get(userId);

    if (!userClients) {
      return;
    }

    for (const [accountId, client] of userClients.entries()) {
      if (accountId === steamAccountId) {
        continue;
      }
      client.logOff();
      userClients.delete(accountId);
    }

    if (userClients.size === 0) {
      this.clients.delete(userId);
      this.activeAccountIdByUser.delete(userId);
      return;
    }

    this.activeAccountIdByUser.set(userId, steamAccountId);
  }
}

export const steamManager = new SteamManager();
