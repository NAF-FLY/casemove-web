import { memo } from "react";
import { Input } from "@heroui/react";
import { Search } from "lucide-react";

import type { InventoryItemDTO } from "@casemove/shared-types";

import { toolbarInputClassNames } from "@/shared/components/ui/inputStyles";
import type { StorageItemsCache } from "@/modules/storage/storage.types";
import StorageSidebarItem from "./StorageSidebarItem";

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

function StorageListPanel({
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
    <div className="sticky top-20 z-20 flex h-[calc(100vh-5rem)] flex-col bg-background">
      <div className="flex h-20 shrink-0 items-center border-b border-border/60 bg-[#151A25] px-4">
        <Input
          aria-label="Search storages..."
          className="w-full"
          classNames={toolbarInputClassNames}
          placeholder="Search storages..."
          color="primary"
          radius="lg"
          size="sm"
          startContent={<Search className="h-4 w-4 text-muted-foreground" />}
          type="text"
          value={storageSearch}
          variant="bordered"
          onValueChange={onStorageSearchChange}
        />
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto pl-4 pr-0 py-4">
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
            const cachedItems = itemsByStorageId[storage.id];
            const cachedCount =
              cachedItems?.totalItems ?? cachedItems?.items.length;

            return (
              <StorageSidebarItem
                key={storage.id}
                storage={storage}
                isActive={isActive}
                cachedCount={cachedCount}
                onSelect={onSelectStorage}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export default memo(StorageListPanel);
