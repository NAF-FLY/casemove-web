"use client";

import Image from "next/image";

import type { InventoryItemDTO } from "@casemove/shared-types";

import { cn } from "@/lib/utils";
import type { StorageItemsCache } from "@/modules/storage/storage.types";
import { storageCurrencyFormatter } from "@/modules/storage/storage.formatters";
import { getStorageName } from "@/modules/storage/storage.utils";
import storageUnitImage from "@/assets/images/unit-storage.png";

type StorageListPanelProps = {
  storageSearch: string;
  onStorageSearchChange: (value: string) => void;
  inventoryLoading: boolean;
  inventoryHydrated: boolean;
  filteredStorageUnits: InventoryItemDTO[];
  activeStorageId: string | null;
  itemsByStorageId: Record<string, StorageItemsCache>;
  onSelectStorage: (id: string) => void;
};

export default function StorageListPanel({
  storageSearch,
  onStorageSearchChange,
  inventoryLoading,
  inventoryHydrated,
  filteredStorageUnits,
  activeStorageId,
  itemsByStorageId,
  onSelectStorage
}: StorageListPanelProps) {
  return (
    <div className="sticky top-0 z-20 flex flex-col h-[calc(100vh)] bg-background">
      <div className="flex h-20 shrink-0 items-center border-b border-border/60 bg-[#151A25] px-4">
      <div className="flex w-full items-center rounded-2xl">
        <input
          type="text"
          placeholder="Search storages..."
          value={storageSearch}
          onChange={(event) => onStorageSearchChange(event.target.value)}
          className="w-full h-10 rounded-xl border-none bg-transparent px-0 text-sm placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto p-4">
        {inventoryLoading || !inventoryHydrated ? (
          <div className="rounded-xl border border-border/40 bg-card px-4 py-3 text-sm text-muted-foreground animate-pulse">
            Loading...
          </div>
        ) : filteredStorageUnits.length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-card px-4 py-3 text-sm text-muted-foreground">
            {storageSearch ? "No matching storages" : "No storage units found"}
          </div>
        ) : (
          filteredStorageUnits.map((storage) => {
            const isActive = storage.id === activeStorageId;
            const storageName = getStorageName(storage.marketHashName);
            const cachedItems = itemsByStorageId[storage.id];
            const cachedCount = cachedItems?.totalItems ?? cachedItems?.items.length;
            const itemCount = cachedCount ?? storage.storageItemsCount;

            return (
              <button
                key={storage.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-200",
                  isActive
                    ? "border-primary bg-primary/10 text-foreground shadow-sm"
                    : "border-border/40 bg-card text-muted-foreground hover:border-border/70 hover:bg-card/80"
                )}
                onClick={() => onSelectStorage(storage.id)}
                type="button"
              >
                <Image
                  src={storageUnitImage}
                  alt="Storage Unit"
                  width={48}
                  height={48}
                  className="shrink-0"
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold truncate">
                    {storageName}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                    <span>
                      {itemCount !== undefined
                        ? `${itemCount} items`
                        : "Click to load"}
                    </span>
                    {storage.storagePrice && storage.storagePrice > 0 && (
                      <>
                        <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
                        <span className="text-primary font-medium">
                          {storageCurrencyFormatter.format(storage.storagePrice)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
