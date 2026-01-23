import { useEffect, useMemo } from "react";

import type { InventoryItemDTO } from "@casemove/shared-types";

import { getStorageName } from "../storage.utils";

type UseStorageUnitsParams = {
  inventoryItems: InventoryItemDTO[];
  storageSearch: string;
  activeStorageId: string | null;
  setActiveStorage: (id: string) => void;
};

function isStorageUnit(item: InventoryItemDTO) {
  return (
    item.marketHashName.startsWith("Storage Unit") ||
    item.schema?.name?.startsWith("Storage Unit")
  );
}

export function useStorageUnits({
  inventoryItems,
  storageSearch,
  activeStorageId,
  setActiveStorage
}: UseStorageUnitsParams) {
  const storageUnits = useMemo(
    () => inventoryItems.filter(isStorageUnit),
    [inventoryItems]
  );

  const filteredStorageUnits = useMemo(() => {
    if (!storageSearch.trim()) {
      return storageUnits;
    }
    const search = storageSearch.toLowerCase();
    return storageUnits.filter((item) => {
      const name = getStorageName(item.marketHashName).toLowerCase();
      return name.includes(search);
    });
  }, [storageUnits, storageSearch]);

  useEffect(() => {
    if (storageUnits.length > 0 && !activeStorageId) {
      setActiveStorage(storageUnits[0].id);
    }
  }, [storageUnits, activeStorageId, setActiveStorage]);

  const activeStorage = useMemo(() => {
    return storageUnits.find((storage) => storage.id === activeStorageId) ?? null;
  }, [storageUnits, activeStorageId]);

  return { storageUnits, filteredStorageUnits, activeStorage };
}
