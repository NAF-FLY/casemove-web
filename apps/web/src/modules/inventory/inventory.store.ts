import { createWithEqualityFn } from "zustand/traditional";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";

import type { InventoryItemDTO } from "@casemove/shared-types";

import { fetchInventory } from "@/core/api-client/inventory.client";
import { depositToStorage as depositToStorageApi, type StorageDepositResponse } from "@/core/api-client/storage.client";

// Custom storage adapter for IndexedDB
const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

type InventoryState = {
  items: InventoryItemDTO[];
  accountId: string | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
  isHydrated: boolean;
  isGrouped: boolean;
  setItems: (items: InventoryItemDTO[]) => void;
  updateItem: (id: string, updates: Partial<InventoryItemDTO>) => void;
  toggleGrouped: () => void;
  loadInventory: (
    accountId: string | null,
    force?: boolean,
    options?: { cacheTtlMs?: number }
  ) => Promise<void>;
  depositToStorage: (storageId: string, itemIds: string[]) => Promise<StorageDepositResponse>;
};

export const useInventoryStore = createWithEqualityFn<InventoryState>()(
  persist(
    (set, get) => ({
      items: [],
      accountId: null,
      loading: false,
      error: null,
      lastUpdated: 0,
      isHydrated: false,
      isGrouped: false,
      setItems: (items) => set({ items }),
      updateItem: (id, updates) => set((state) => ({
        items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item))
      })),
      toggleGrouped: () => set((state) => ({ isGrouped: !state.isGrouped })),
      loadInventory: async (
        accountId: string | null,
        force = false,
        options
      ) => {
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        const now = Date.now();
        const { lastUpdated, items: currentItems, loading, accountId: currentAccountId } = get();

        // Prevent parallel requests for the same account
        if (loading && accountId === currentAccountId) {
          return;
        }

        // If switching accounts, check if we need to clear items
        if (accountId !== currentAccountId) {
          set({ items: [], accountId, lastUpdated: 0 });
          force = true;
        }

        // Skip if no account selected
        if (!accountId) {
          return;
        }

        // Check cache validity using persisted timestamp
        const isCacheValid =
          !force &&
          !loading &&
          currentItems.length > 0 &&
          now - lastUpdated < CACHE_DURATION;

        if (isCacheValid) {
          return;
        }
        
        set({ loading: true, error: null });

        try {
          const items = await fetchInventory(force, options?.cacheTtlMs);
          const previousItems = get().items;
          const previousById = new Map(previousItems.map((item) => [item.id, item]));
          const mergedItems = items.map((item) => {
            const previous = previousById.get(item.id);
            if (!previous) {
              return item;
            }
            const storagePrice =
              item.storagePrice == null || (item.storagePrice === 0 && (previous.storagePrice ?? 0) > 0)
                ? previous.storagePrice
                : item.storagePrice;
            const storageItemsCount =
              item.storageItemsCount == null ||
              (item.storageItemsCount === 0 && (previous.storageItemsCount ?? 0) > 0)
                ? previous.storageItemsCount
                : item.storageItemsCount;
            return {
              ...item,
              storagePrice,
              storageItemsCount
            };
          });
          set({ items: mergedItems, loading: false, lastUpdated: Date.now() });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load inventory",
            loading: false
          });
        }
      },
      depositToStorage: async (storageId, itemIds) => {
        const response = await depositToStorageApi(storageId, itemIds);
        const accountId = get().accountId;
        if (accountId) {
          await get().loadInventory(accountId, true);
        }
        return response;
      }
    }),
    {
      name: "inventory-storage", // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => storage), // Use IndexedDB
      partialize: (state) => ({ 
        items: state.items, 
        accountId: state.accountId, 
        lastUpdated: state.lastUpdated,
        isGrouped: state.isGrouped
      }), // only persist these fields
      onRehydrateStorage: () => (state) => {
        state?.setItems(state.items); // Force re-render if needed
        if (state) {
          // We can't set state directly on the draft if it's not a setter, 
          // but here we are in the callback after rehydration.
          // Zustand persist doesn't expose a simple "set isHydrated", so we might need a separate action
          // or just assume if we are here, we are hydrated.
          // Better approach: use a store action to set hydrated.
          useInventoryStore.setState({ isHydrated: true });
        }
      }
    }
  )
);
