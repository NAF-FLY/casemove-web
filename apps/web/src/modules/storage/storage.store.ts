import { createWithEqualityFn } from "zustand/traditional";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";

import type { StorageItemsCache } from "@/modules/storage/storage.types";
import { useInventoryStore } from "@/modules/inventory/inventory.store";
import { withdrawFromStorage } from "@/core/api-client/storage.client";


// Custom storage adapter for IndexedDB (same as inventory.store.ts)
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

type StorageState = {
  activeStorageId: string | null;
  itemsByStorageId: Record<string, StorageItemsCache>;
  loadingStorageId: string | null;
  loading: boolean;
  error: string | null;
  warning: string | null;
  isHydrated: boolean;
  accountId: string | null;
  setAccountId: (id: string | null) => void;
  setActiveStorage: (id: string) => void;
  invalidateStorage: (id: string) => void;
  setLoading: (loading: boolean, storageId?: string | null) => void;
  setError: (error: string | null) => void;
  setWarning: (warning: string | null) => void;
  setStorageItems: (id: string, data: StorageItemsCache) => void;
  clearWarning: () => void;
  withdrawItems: (storageId: string, itemIds: string[]) => Promise<any>;
};

export const useStorageStore = createWithEqualityFn<StorageState>()(
  persist(
    (set, get) => ({
      activeStorageId: null,
      itemsByStorageId: {},
      loadingStorageId: null,
      loading: false,
      error: null,
      warning: null,
      isHydrated: false,
      accountId: null,
      setAccountId: (id) => {
        const { accountId } = get();
        if (id !== accountId) {
          set({
            accountId: id,
            itemsByStorageId: {},
            activeStorageId: null,
            loading: false,
            error: null,
            warning: null
          });
        }
      },
      setActiveStorage: (id) => set({ activeStorageId: id }),
      setLoading: (loading, storageId = null) =>
        set({ loading, loadingStorageId: loading ? storageId : null }),
      setError: (error) => set({ error }),
      setWarning: (warning) => set({ warning }),
      clearWarning: () => set({ warning: null }),
      setStorageItems: (id, data) =>
        set((state) => ({
          itemsByStorageId: {
            ...state.itemsByStorageId,
            [id]: data
          }
        })),
      invalidateStorage: (id) => {
        const { itemsByStorageId } = get();
        const newCache = { ...itemsByStorageId };
        delete newCache[id];
        set({ itemsByStorageId: newCache });
      },
      withdrawItems: async (storageId, itemIds) => {
        set({ loading: true, loadingStorageId: storageId, error: null });
        try {
          const result = await withdrawFromStorage(storageId, itemIds);
          // Invalidate storage cache to force refresh on next view
          // Also inventory cache will be invalidated on backend, frontend should reload if needed
          const { itemsByStorageId } = get();
          const newCache = { ...itemsByStorageId };
          delete newCache[storageId];
          set({ itemsByStorageId: newCache, loading: false, loadingStorageId: null });
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to withdraw items";
          set({ error: message, loading: false, loadingStorageId: null });
          throw err;
        }
      }
    }),
    {
      name: "storage-items-cache",
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        itemsByStorageId: state.itemsByStorageId,
        activeStorageId: state.activeStorageId,
        accountId: state.accountId
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const inventoryState = useInventoryStore.getState();
          for (const [storageId, cache] of Object.entries(state.itemsByStorageId)) {
            const totalItems = cache.totalItems ?? cache.items.length;
            if (totalItems > 0 || cache.totalValue) {
              inventoryState.updateItem(storageId, {
                storageItemsCount: totalItems,
                storagePrice: cache.totalValue
              });
            }
          }
          useStorageStore.setState({ isHydrated: true });
        }
      }
    }
  )
);
