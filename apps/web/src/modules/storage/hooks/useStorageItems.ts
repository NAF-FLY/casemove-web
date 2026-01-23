import { useMemo } from "react";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { StorageItemsCache } from "../storage.types";

type UseStorageItemsParams = {
  activeStorageId: string | null;
  itemsByStorageId: Record<string, StorageItemsCache>;
  itemSearch: string;
};

type UseStorageItemsResult = {
  storageItems: StorageItemsCache["items"];
  filteredStorageItems: StorageItemsCache["items"];
  updatedAt: string | undefined;
  lastUpdated: number | undefined;
  totalValue: number;
  debouncedItemSearch: string;
};

export function useStorageItems({
  activeStorageId,
  itemsByStorageId,
  itemSearch
}: UseStorageItemsParams): UseStorageItemsResult {
  const debouncedItemSearch = useDebouncedValue(itemSearch, itemSearch ? 300 : 0);

  const storageItemsCache = activeStorageId
    ? itemsByStorageId[activeStorageId]
    : null;
  const storageItems = storageItemsCache?.items ?? [];
  const updatedAt = storageItemsCache?.updatedAt;
  const lastUpdated = storageItemsCache?.lastUpdated;

  const filteredStorageItems = useMemo(() => {
    if (!debouncedItemSearch.trim()) {
      return storageItems;
    }
    const tokens = debouncedItemSearch
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    return storageItems.filter((item) => {
      const searchText = [
        item.schema?.name ?? item.marketHashName,
        item.marketHashName,
        item.schema?.rarity,
        item.schema?.weapon,
        item.schema?.collection
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();
      return tokens.every((token) => searchText.includes(token));
    });
  }, [storageItems, debouncedItemSearch]);

  const totalValue = useMemo(() => {
    return filteredStorageItems.reduce(
      (sum, item) => sum + (item.price ?? 0),
      0
    );
  }, [filteredStorageItems]);

  const result: UseStorageItemsResult = {
    storageItems,
    filteredStorageItems,
    updatedAt,
    lastUpdated,
    totalValue,
    debouncedItemSearch
  };

  return result;
}
