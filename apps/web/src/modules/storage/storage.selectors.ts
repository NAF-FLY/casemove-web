import { shallow } from "zustand/shallow";

import { useInventoryStore } from "@/modules/inventory/inventory.store";
import { useStorageStore } from "@/modules/storage/storage.store";

export function useInventoryCore() {
  return useInventoryStore(
    (state) => ({
      items: state.items,
      loading: state.loading,
      isHydrated: state.isHydrated,
      loadInventory: state.loadInventory
    }),
    shallow
  );
}

export function useStorageCore() {
  return useStorageStore(
    (state) => ({
      activeStorageId: state.activeStorageId,
      accountId: state.accountId,
      itemsByStorageId: state.itemsByStorageId,
      loading: state.loading,
      error: state.error,
      warning: state.warning,
      setActiveStorage: state.setActiveStorage,
      clearWarning: state.clearWarning,
      setAccountId: state.setAccountId
    }),
    shallow
  );
}

export function useStorageReadiness() {
  const inventory = useInventoryStore(
    (state) => ({
      inventoryHydrated: state.isHydrated,
      inventoryLoading: state.loading
    }),
    shallow
  );
  const storage = useStorageStore(
    (state) => ({
      storageHydrated: state.isHydrated,
      storageLoading: state.loading
    }),
    shallow
  );

  return {
    ...inventory,
    ...storage,
    isReady: inventory.inventoryHydrated && storage.storageHydrated
  };
}
