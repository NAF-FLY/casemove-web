import { create } from "zustand";

import type { InventoryItemDTO, StorageUnitDTO } from "@casemove/shared-types";
import {
  fetchStorageItems,
  fetchStorages
} from "@/lib/api-client/storage";

type StorageState = {
  storages: StorageUnitDTO[];
  activeStorageId: string | null;
  itemsByStorageId: Record<string, InventoryItemDTO[]>;
  loading: boolean;
  error: string | null;
  setActiveStorage: (id: string) => void;
  loadStorages: () => Promise<void>;
  loadStorageItems: (id: string) => Promise<void>;
};

export const useStorageStore = create<StorageState>((set, get) => ({
  storages: [],
  activeStorageId: null,
  itemsByStorageId: {},
  loading: false,
  error: null,
  setActiveStorage: (id) => set({ activeStorageId: id }),
  loadStorages: async () => {
    set({ loading: true, error: null });

    try {
      const storages = await fetchStorages();
      const currentActive = get().activeStorageId;

      set({
        storages,
        activeStorageId:
          currentActive ?? (storages.length > 0 ? storages[0].id : null),
        loading: false
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  },
  loadStorageItems: async (id) => {
    const { itemsByStorageId } = get();

    if (itemsByStorageId[id]) {
      return;
    }

    set({ loading: true, error: null });

    try {
      const items = await fetchStorageItems(id);

      set({
        itemsByStorageId: { ...itemsByStorageId, [id]: items },
        loading: false
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}));
