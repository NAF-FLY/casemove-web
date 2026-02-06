"use client";

import type { InventoryItemDTO } from "@casemove/shared-types";

import { getStorageName } from "@/modules/storage/storage.utils";

type StorageEmptyStateProps = {
  activeStorage: InventoryItemDTO;
};

export default function StorageEmptyState({
  activeStorage
}: StorageEmptyStateProps) {
  return (
    <div className="px-6 py-12 text-center text-sm text-muted-foreground">
      <p className="font-semibold text-foreground mb-2">
        {getStorageName(activeStorage.marketHashName)}
      </p>
      {activeStorage.storageItemsCount && activeStorage.storageItemsCount > 0 ? (
        <div className="flex flex-col gap-2 items-center">
          <p className="text-yellow-500 font-medium">Data mismatch detected</p>
          <p>
            Inventory indicates {activeStorage.storageItemsCount} items, but
            storage details are missing.
          </p>
          <p className="text-xs">
            Steam might be returning empty results. Please try refreshing.
          </p>
        </div>
      ) : (
        <p>This storage unit is empty</p>
      )}
    </div>
  );
}
