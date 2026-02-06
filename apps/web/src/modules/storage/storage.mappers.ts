import type { StorageResponse } from "@/core/api-client/storage.client";
import type { StorageItemsCache } from "./storage.types";

export function mapStorageResponseToCache(
  response: StorageResponse,
  fetchedAt = Date.now()
): StorageItemsCache {
  return {
    items: response.items,
    totalValue: response.totalValue,
    totalItems: response.totalItems,
    updatedAt: response.updatedAt,
    lastUpdated: fetchedAt
  };
}
