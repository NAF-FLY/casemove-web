import { FolderInput, Wallet } from "lucide-react";
import { Select, SelectItem } from "@heroui/react";

import type { InventoryItemDTO } from "@casemove/shared-types";

import type { StorageItemsCache } from "@/modules/storage/storage.types";
import { getStorageName } from "@/modules/storage/storage.utils";

import type { TransferDrawerConfig } from "./types";

type TransferSourceProps = {
  config: TransferDrawerConfig;
  // For deposit mode - select storage destination
  storageUnits?: InventoryItemDTO[];
  selectedDestination?: string | null;
  setSelectedDestination?: (id: string | null) => void;
  itemsByStorageId?: Record<string, StorageItemsCache>;
  // For withdraw mode - show current storage as source
  currentStorageName?: string;
};

export default function TransferSource({
  config,
  storageUnits = [],
  selectedDestination = null,
  setSelectedDestination,
  itemsByStorageId = {},
  currentStorageName
}: TransferSourceProps) {
  if (config.mode === "withdraw") {
    // Withdraw mode: show storage as source, inventory as destination
    return (
      <div className="relative grid grid-cols-[24px_1fr] gap-x-4 gap-y-6 p-6">
        <div className="absolute bottom-6 left-[35px] top-6 w-[2px] bg-gradient-to-b from-white/10 via-white/25 to-white/10" />

        <div className="flex items-start justify-center">
          <div className="z-10 h-3 w-3 rounded-full bg-slate-500 ring-4 ring-slate-900" />
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            {config.sourceLabel}
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <FolderInput className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium">{currentStorageName ?? "Storage Unit"}</div>
              <div className="text-xs text-muted-foreground">
                Selected storage
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start justify-center">
          <div className="z-10 h-3 w-3 rounded-full bg-primary ring-4 ring-slate-900" />
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-primary">
            {config.destinationLabel}
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium">Active Inventory</div>
              <div className="text-xs text-muted-foreground">
                Currently selected account
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Items will be moved to your active inventory immediately.
          </div>
        </div>
      </div>
    );
  }

  // Deposit mode: show inventory as source, storage selector as destination
  return (
    <div className="relative grid grid-cols-[24px_1fr] gap-x-4 gap-y-6 p-6">
      <div className="absolute bottom-6 left-[35px] top-6 w-[2px] bg-gradient-to-b from-white/10 via-white/25 to-white/10" />

      <div className="flex items-start justify-center">
        <div className="z-10 h-3 w-3 rounded-full bg-slate-500 ring-4 ring-slate-900" />
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          {config.sourceLabel}
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium">Active Inventory</div>
            <div className="text-xs text-muted-foreground">
              Currently selected account
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-center">
        <div className="z-10 h-3 w-3 rounded-full bg-primary ring-4 ring-slate-900" />
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-primary">
          {config.destinationLabel}
        </div>

        <Select
          aria-label="Select destination"
          placeholder={
            storageUnits.length > 0
              ? "Select destination..."
              : "No storage units available"
          }
          isDisabled={storageUnits.length === 0}
          selectedKeys={
            selectedDestination ? new Set([selectedDestination]) : new Set()
          }
          onSelectionChange={(keys) => {
            const [first] = Array.from(keys);
            setSelectedDestination?.((first as string) ?? null);
          }}
          selectionMode="single"
          disallowEmptySelection
          startContent={<FolderInput className="h-5 w-5 text-muted-foreground" />}
          classNames={{
            trigger:
              "h-14 rounded-xl border border-white/10 bg-[#1B2535] text-base shadow-none outline-none ring-0 data-[hover=true]:border-primary/40 data-[focus=true]:border-primary data-[focus=true]:ring-1 data-[focus=true]:ring-primary data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-1 data-[focus-visible=true]:ring-primary data-[open=true]:!border-primary data-[open=true]:!ring-1 data-[open=true]:!ring-primary data-[focus=true]:data-[hover=true]:!border-primary focus:outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-within:border-primary focus-within:ring-1 focus-within:ring-primary cursor-pointer",
            base: "outline-none ring-0 focus:outline-none focus-visible:outline-none",
            innerWrapper: "gap-3",
            value: "text-base text-foreground",
            popoverContent: "bg-[#151A25] border border-white/10"
          }}
          radius="lg"
          variant="bordered"
        >
          {storageUnits.map((unit) => {
            const name = getStorageName(unit.marketHashName);
            const cached = itemsByStorageId[unit.id];
            const cachedCount = cached?.totalItems ?? cached?.items.length;
            const inventoryCount = unit.storageItemsCount ?? null;
            const count =
              inventoryCount === null ||
              (inventoryCount === 0 && (cachedCount ?? 0) > 0)
                ? (cachedCount ?? 0)
                : inventoryCount;
            return (
              <SelectItem key={unit.id} textValue={`${name} (${count} items)`}>
                {name} ({count} items)
              </SelectItem>
            );
          })}
        </Select>

        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          Items will be moved to the selected storage unit immediately.
        </div>
      </div>
    </div>
  );
}
