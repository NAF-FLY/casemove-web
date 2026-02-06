"use client";

import type { InventoryItemDTO } from "@casemove/shared-types";

import InventoryTable from "@/modules/inventory/components/InventoryTable";
import StorageEmptyState from "@/modules/storage/components/StorageEmptyState";

import { useStorageSelection } from "@/modules/storage/storageSelection.store";

type StorageContentPanelProps = {
  activeStorage: InventoryItemDTO | null;
  storageLoading: boolean;
  storageItems: InventoryItemDTO[];
  filteredStorageItems: InventoryItemDTO[];
  debouncedItemSearch: string;
  storageWarning: string | null;
  storageError: string | null;
  isReady: boolean;
  hasStorageCache: boolean;
};

export default function StorageContentPanel({
  activeStorage,
  storageLoading,
  storageItems,
  filteredStorageItems,
  debouncedItemSearch,
  storageWarning,
  storageError,
  isReady,
  hasStorageCache
}: StorageContentPanelProps) {
  const { selected, toggle, toggleGroup } = useStorageSelection();

  return (
    <div className="h-full w-full px-8">
      {!activeStorage ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
          Select a storage unit to view its contents
        </div>
      ) : storageLoading || !isReady || !hasStorageCache ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground animate-pulse">
          <div className="mx-auto flex max-w-md flex-col gap-3">
            <div className="h-4 w-40 rounded-full bg-muted/40" />
            <div className="h-3 w-64 rounded-full bg-muted/30" />
            <div className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-3">
              <div className="h-24 rounded-xl bg-muted/30" />
              <div className="h-24 rounded-xl bg-muted/30" />
              <div className="h-24 rounded-xl bg-muted/30" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {storageWarning && (
            <div className="mb-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
              {storageWarning}
            </div>
          )}
          {storageError && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {storageError}
            </div>
          )}

          {storageItems.length === 0 ? (
            <StorageEmptyState activeStorage={activeStorage} />
          ) : (
            <InventoryTable
              items={filteredStorageItems}
              viewMode="grid"
              emptyMessage={
                debouncedItemSearch
                  ? "No items match your search"
                  : "Storage is empty"
              }
              selectedIds={selected}
              onSelectionToggle={toggle}
              onSelectionGroupToggle={toggleGroup}
            />
          )}
        </>
      )}
    </div>
  );
}
