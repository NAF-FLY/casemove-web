import { create } from "zustand";

import type {
  ConnectSteamAccountPayload,
  CreateSteamAccountPayload,
  SteamAccount
} from "@/lib/api-client/steam-accounts";
import {
  connectSteamAccount,
  createSteamAccount,
  deleteSteamAccount,
  disconnectSteamAccount,
  fetchSteamAccounts,
  switchSteamAccount,
  tryAutoConnect
} from "@/lib/api-client/steam-accounts";

type SteamAccountsState = {
  accounts: SteamAccount[];
  activeAccountId: string | null;
  loading: boolean;
  actionLoading: string | null;
  addError: string | null;
  listError: string | null;
  loadAccounts: () => Promise<void>;
  addAccount: (payload: CreateSteamAccountPayload) => Promise<void>;
  connectAccount: (
    accountId: string,
    payload?: ConnectSteamAccountPayload
  ) => Promise<void>;
  tryAutoConnectAccount: (accountId: string) => Promise<boolean>;
  disconnectAccount: (accountId: string) => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  clearAddError: () => void;
  clearListError: () => void;
};

export const useSteamAccountsStore = create<SteamAccountsState>((set, get) => ({
  accounts: [],
  activeAccountId: null,
  loading: false,
  actionLoading: null,
  addError: null,
  listError: null,

  loadAccounts: async () => {
    set({ loading: true, listError: null });

    try {
      const data = await fetchSteamAccounts();

      set({
        accounts: data.accounts,
        activeAccountId: data.activeSteamAccountId,
        loading: false
      });
    } catch (error) {
      set({
        loading: false,
        listError: error instanceof Error ? error.message : "Unknown error"
      });
    }
  },

  addAccount: async (payload) => {
    set({ actionLoading: "add", addError: null });

    try {
      const account = await createSteamAccount(payload);
      const { accounts } = get();

      set({
        accounts: [account, ...accounts.map(a => ({ ...a, status: "idle" as const }))],
        activeAccountId: account.id,
        actionLoading: null
      });
    } catch (error) {
      set({
        actionLoading: null,
        addError: error instanceof Error ? error.message : "Failed to add account"
      });
      throw error;
    }
  },

  connectAccount: async (accountId, payload) => {
    set({ actionLoading: accountId, listError: null });

    try {
      const updatedAccount = await connectSteamAccount(accountId, payload);
      const { accounts } = get();

      set({
        accounts: accounts.map((acc) => {
          if (acc.id === accountId) return updatedAccount;
          return { ...acc, status: "idle" as const };
        }),
        activeAccountId: accountId,
        actionLoading: null
      });
    } catch (error) {
      set({
        actionLoading: null,
        listError:
          error instanceof Error ? error.message : "Failed to connect account"
      });
      throw error;
    }
  },

  tryAutoConnectAccount: async (accountId) => {
    set({ actionLoading: accountId, listError: null });

    try {
      const result = await tryAutoConnect(accountId);
      if (result) {
        const { accounts } = get();
        set({
          accounts: accounts.map((acc) => {
            if (acc.id === accountId) return result;
            return { ...acc, status: "idle" as const };
          }),
          activeAccountId: accountId,
          actionLoading: null
        });
        return true;
      }
      // Password required
      set({ actionLoading: null });
      return false;
    } catch (error) {
      set({
        actionLoading: null,
        listError:
          error instanceof Error ? error.message : "Failed to connect account"
      });
      return false;
    }
  },

  disconnectAccount: async (accountId) => {
    set({ actionLoading: accountId, listError: null });

    try {
      await disconnectSteamAccount(accountId);
      const { accounts, activeAccountId } = get();

      set({
        accounts: accounts.map((acc) =>
          acc.id === accountId ? { ...acc, status: "idle" as const } : acc
        ),
        activeAccountId:
          activeAccountId === accountId ? null : activeAccountId,
        actionLoading: null
      });
    } catch (error) {
      set({
        actionLoading: null,
        listError:
          error instanceof Error
            ? error.message
            : "Failed to disconnect account"
      });
    }
  },

  switchAccount: async (accountId) => {
    set({ actionLoading: accountId, listError: null });

    try {
      await switchSteamAccount(accountId);

      set({
        activeAccountId: accountId,
        actionLoading: null
      });
    } catch (error) {
      set({
        actionLoading: null,
        listError:
          error instanceof Error ? error.message : "Failed to switch account"
      });
    }
  },

  deleteAccount: async (accountId) => {
    set({ actionLoading: accountId, listError: null });

    try {
      await deleteSteamAccount(accountId);
      const { accounts, activeAccountId } = get();

      set({
        accounts: accounts.filter((acc) => acc.id !== accountId),
        activeAccountId:
          activeAccountId === accountId ? null : activeAccountId,
        actionLoading: null
      });
    } catch (error) {
      set({
        actionLoading: null,
        listError:
          error instanceof Error ? error.message : "Failed to delete account"
      });
    }
  },

  clearAddError: () => set({ addError: null }),
  clearListError: () => set({ listError: null })
}));

