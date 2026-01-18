import { create } from "zustand";

import type { InventoryItemDTO } from "@casemove/shared-types";

import { fetchInventory } from "@/lib/api-client/inventory";

type InventoryState = {
  items: InventoryItemDTO[];
  accountId: string | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
  setItems: (items: InventoryItemDTO[]) => void;
  loadInventory: (accountId: string | null, force?: boolean) => Promise<void>;
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  accountId: null,
  loading: false,
  error: null,
  lastUpdated: 0,
  setItems: (items) => set({ items }),
  loadInventory: async (accountId: string | null, force = false) => {
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    const { lastUpdated, items: currentItems, loading, accountId: currentAccountId } = get();

    // If switching accounts, clear previous items immediately
    if (accountId !== currentAccountId) {
      set({ items: [], accountId, lastUpdated: 0 });
      force = true;
    }

    // Skip if no account selected
    if (!accountId) {
      return;
    }

    if (!force && !loading && currentItems.length > 0 && now - lastUpdated < CACHE_DURATION) {
      return;
    }

    set({ loading: true, error: null });

    try {
      const items = await fetchInventory(force);
      set({ items, loading: false, lastUpdated: Date.now() });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load inventory",
        loading: false
      });
    }
  }
}));
