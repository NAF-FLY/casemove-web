import { create } from "zustand";

import type { InventoryItemDTO } from "@casemove/shared-types";

import { fetchInventory } from "@/lib/api-client/inventory";

type InventoryState = {
  items: InventoryItemDTO[];
  loading: boolean;
  error: string | null;
  setItems: (items: InventoryItemDTO[]) => void;
  loadInventory: () => Promise<void>;
};

export const useInventoryStore = create<InventoryState>((set) => ({
  items: [],
  loading: false,
  error: null,
  setItems: (items) => set({ items }),
  loadInventory: async () => {
    set({ loading: true, error: null });

    try {
      const items = await fetchInventory();
      set({ items, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load inventory",
        loading: false
      });
    }
  }
}));
