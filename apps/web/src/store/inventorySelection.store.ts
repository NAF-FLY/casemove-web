import { create } from "zustand";

type InventorySelectionState = {
  selected: Set<string>;
  toggle: (id: string) => void;
  clear: () => void;
};

export const useInventorySelection = create<InventorySelectionState>((set) => ({
  selected: new Set(),
  toggle: (id) =>
    set((state) => {
      const nextSelected = new Set(state.selected);

      if (nextSelected.has(id)) {
        nextSelected.delete(id);
      } else {
        nextSelected.add(id);
      }

      return { selected: nextSelected };
    }),
  clear: () => set({ selected: new Set() })
}));
