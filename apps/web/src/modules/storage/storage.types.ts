import type { InventoryItemDTO } from "@casemove/shared-types";

export type StorageItemsCache = {
  items: InventoryItemDTO[];
  totalValue?: number;
  totalItems?: number;
  updatedAt?: string; // Server timestamp
  lastUpdated: number; // Client fetch timestamp
};
