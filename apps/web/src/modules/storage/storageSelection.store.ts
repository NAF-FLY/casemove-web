import { create } from "zustand";

type StorageSelectionState = {
  selected: Set<string>;
  quantities: Record<string, number>;
  toggle: (id: string) => void;
  toggleGroup: (ids: string[]) => void;
  setQuantity: (key: string, quantity: number) => void;
  setQuantities: (quantities: Record<string, number>) => void;
  clearQuantities: () => void;
  clear: () => void;
};

export const useStorageSelection = create<StorageSelectionState>((set) => ({
  selected: new Set(),
  quantities: {},
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
  clearQuantities: () => set({ quantities: {} }),
  clear: () => set({ selected: new Set(), quantities: {} })
}));
