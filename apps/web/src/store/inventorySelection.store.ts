import { create } from "zustand";

type InventorySelectionState = {
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleGroup: (ids: string[]) => void;
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
  toggleGroup: (ids) =>
    set((state) => {
      const nextSelected = new Set(state.selected);
      // Check if all items in the group are selected
      const allSelected = ids.every((id) => nextSelected.has(id));

      if (allSelected) {
        // Deselect all items in the group
        for (const id of ids) {
          nextSelected.delete(id);
        }
      } else {
        // Select all items in the group
        for (const id of ids) {
          nextSelected.add(id);
        }
      }

      return { selected: nextSelected };
    }),
  clear: () => set({ selected: new Set() })
}));
