export type SteamAccountStatus = "idle" | "pending" | "connected" | "error";

export type SteamAccount = {
  id: string;
  steam_login: string;
  persona_name: string | null;
  steam_id: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  trade_url: string | null;
  account_created_at: string | null;
  profile_updated_at: string | null;
  status: SteamAccountStatus;
  proxy_socks5: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateSteamAccountPayload = {
  steamLogin: string;
  password: string;
  twoFactorCode?: string;
  proxySocks5?: string;
};

export type ConnectSteamAccountPayload = {
  password?: string;
  twoFactorCode?: string;
};

type FetchAccountsResponse = {
  accounts: SteamAccount[];
  activeSteamAccountId: string | null;
};

type AccountResponse = {
  account: SteamAccount;
};

export async function fetchSteamAccounts(): Promise<FetchAccountsResponse> {
  const response = await fetch("/api/steam-accounts");

  if (!response.ok) {
    throw new Error("Failed to fetch steam accounts");
  }

  return response.json();
}

export async function createSteamAccount(
  payload: CreateSteamAccountPayload
): Promise<SteamAccount> {
  const response = await fetch("/api/steam-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to create account");
  }

  const data: AccountResponse = await response.json();
  return data.account;
}

export async function connectSteamAccount(
  accountId: string,
  payload?: ConnectSteamAccountPayload
): Promise<SteamAccount> {
  const response = await fetch(`/api/steam-accounts/${accountId}/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {})
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    // Check if password is required (session expired)
    if (data.requiresPassword) {
      const error = new Error(data.message || "Password required");
      (error as Error & { requiresPassword?: boolean }).requiresPassword = true;
      throw error;
    }
    throw new Error(data.message || "Failed to connect account");
  }

  const data: AccountResponse = await response.json();
  return data.account;
}

/**
 * Try to connect using saved refresh token (auto-reconnect).
 * Returns account if successful, null if password is required.
 */
export async function tryAutoConnect(
  accountId: string
): Promise<SteamAccount | null> {
  try {
    return await connectSteamAccount(accountId);
  } catch (error) {
    if ((error as Error & { requiresPassword?: boolean }).requiresPassword) {
      return null;
    }
    throw error;
  }
}

export async function disconnectSteamAccount(accountId: string): Promise<void> {
  const response = await fetch(`/api/steam-accounts/${accountId}/disconnect`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Failed to disconnect account");
  }
}

export async function switchSteamAccount(accountId: string): Promise<void> {
  const response = await fetch(`/api/steam-accounts/${accountId}/switch`, {
    method: "POST"
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to switch account");
  }
}

export async function deleteSteamAccount(accountId: string): Promise<void> {
  const response = await fetch(`/api/steam-accounts/${accountId}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("Failed to delete account");
  }
}
