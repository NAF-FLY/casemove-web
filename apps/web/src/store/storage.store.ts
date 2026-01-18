import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";

import type { InventoryItemDTO } from "@casemove/shared-types";

import { fetchStorageItems } from "@/lib/api-client/storage";

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

type StorageItemsCache = {
  items: InventoryItemDTO[];
  lastUpdated: number;
};

type StorageState = {
  activeStorageId: string | null;
  itemsByStorageId: Record<string, StorageItemsCache>;
  loading: boolean;
  error: string | null;
  isHydrated: boolean;
  setActiveStorage: (id: string) => void;
  loadStorageItems: (id: string, force?: boolean) => Promise<void>;
  invalidateStorage: (id: string) => void;
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (storage items rarely change)

export const useStorageStore = create<StorageState>()(
  persist(
    (set, get) => ({
      activeStorageId: null,
      itemsByStorageId: {},
      loading: false,
      error: null,
      isHydrated: false,
      setActiveStorage: (id) => set({ activeStorageId: id }),
      loadStorageItems: async (id, force = false) => {
        const { itemsByStorageId, loading } = get();
        const now = Date.now();
        const cached = itemsByStorageId[id];

        // Check cache validity
        if (!force && !loading && cached && now - cached.lastUpdated < CACHE_DURATION) {
          return;
        }

        set({ loading: true, error: null });

        try {
          const items = await fetchStorageItems(id);

          // Protect against overwriting valid cache with empty API response
          // This can happen when Steam GC temporarily fails to return data
          // Always protect, even on manual refresh - Steam GC can fail anytime
          const existingCache = get().itemsByStorageId[id];
          if (items.length === 0 && existingCache && existingCache.items.length > 0) {
            console.warn(`[StorageStore] API returned empty for storage ${id}, keeping ${existingCache.items.length} cached items`);
            set({ loading: false, error: "Steam returned empty response, showing cached data" });
            return;
          }

          set({
            itemsByStorageId: {
              ...get().itemsByStorageId,
              [id]: { items, lastUpdated: Date.now() }
            },
            loading: false
          });
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : "Failed to load storage items"
          });
        }
      },
      invalidateStorage: (id) => {
        const { itemsByStorageId } = get();
        const newCache = { ...itemsByStorageId };
        delete newCache[id];
        set({ itemsByStorageId: newCache });
      }
    }),
    {
      name: "storage-items-cache",
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        itemsByStorageId: state.itemsByStorageId,
        activeStorageId: state.activeStorageId
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          useStorageStore.setState({ isHydrated: true });
        }
      }
    }
  )
);
