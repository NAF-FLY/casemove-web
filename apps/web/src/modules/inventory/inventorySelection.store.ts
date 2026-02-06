import { createWithEqualityFn } from "zustand/traditional";

type InventorySelectionState = {
  selected: Set<string>;
  quantities: Record<string, number>;
  selectedDestination: string | null;
  toggle: (id: string) => void;
  toggleGroup: (ids: string[]) => void;
  setQuantity: (key: string, quantity: number) => void;
  setQuantities: (quantities: Record<string, number>) => void;
  setSelectedDestination: (destination: string | null) => void;
  clearSelectedDestination: () => void;
  clearQuantities: () => void;
  clear: () => void;
};

export const useInventorySelection = createWithEqualityFn<InventorySelectionState>()((set) => ({
  selected: new Set(),
  quantities: {},
  selectedDestination: null,
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
  setQuantity: (key, quantity) =>
    set((state) => ({
      quantities: {
        ...state.quantities,
        [key]: quantity
      }
    })),
  setQuantities: (quantities) => set({ quantities }),
  setSelectedDestination: (destination) => set({ selectedDestination: destination }),
  clearSelectedDestination: () => set({ selectedDestination: null }),
  clearQuantities: () => set({ quantities: {} }),
  clear: () => set({ selected: new Set() })
}));
