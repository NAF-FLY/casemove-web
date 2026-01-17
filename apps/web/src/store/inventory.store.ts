import { create } from "zustand";

import type { InventoryItemDTO } from "@casemove/shared-types";

import { fetchInventory } from "@/lib/api-client/inventory";

type InventoryState = {
  items: InventoryItemDTO[];
  loading: boolean;
  error: string | null;
  lastUpdated: number;
  setItems: (items: InventoryItemDTO[]) => void;
  loadInventory: (force?: boolean) => Promise<void>;
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastUpdated: 0,
  setItems: (items) => set({ items }),
  loadInventory: async (force = false) => {
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    const { lastUpdated, items: currentItems, loading } = get();

    if (!force && !loading && currentItems.length > 0 && now - lastUpdated < CACHE_DURATION) {
      return;
    }

    set({ loading: true, error: null });

    try {
      const items = await fetchInventory();
      set({ items, loading: false, lastUpdated: Date.now() });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load inventory",
        loading: false
      });
    }
  }
}));
