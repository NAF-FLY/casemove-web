"use client";

import { X, ArrowRightLeft, ArrowDownToLine } from "lucide-react";
import type { MutableRefObject } from "react";

import type { InventoryItemDTO } from "@casemove/shared-types";

import type { StorageItemsCache } from "@/modules/storage/storage.types";

import { cn } from "@/shared/utils/utils";
import {
  type TransferMode,
  type GroupedTransferItem,
  type TransferResult,
  TRANSFER_CONFIGS
} from "./types";
import TransferSummary from "./TransferSummary";
import TransferAlerts from "./TransferAlerts";
import TransferSource from "./TransferSource";
import TransferItemList from "./TransferItemList";
import TransferFooter from "./TransferFooter";

type TransferDrawerProps = {
  mode: TransferMode;
  isOpen: boolean;
  onClose: () => void;
  // Items
  selectedItems: InventoryItemDTO[];
  groupedItems: GroupedTransferItem[];
  quantities: Record<string, number>;
  availableItemsByKey: Map<string, InventoryItemDTO[]>;
  totalSelectedCount: number;
  totalValue: number;
  // Deposit mode props
  storageUnits?: InventoryItemDTO[];
  selectedDestination?: string | null;
  setSelectedDestination?: (id: string | null) => void;
  itemsByStorageId?: Record<string, StorageItemsCache>;
  // Withdraw mode props
  currentStorageName?: string;
  // Handlers
  onRemove: (key: string) => void;
  setQuantity: (id: string, value: number) => void;
  touchedQuantitiesRef: MutableRefObject<Set<string>>;
  onTransfer: () => void;
  isTransferring: boolean;
  transferError: string | null;
  transferResults: TransferResult[] | null;
  transferSuccess: string | null;
  getItemImageUrl: (item: InventoryItemDTO) => string | null;
};

export default function TransferDrawer({
  mode,
  isOpen,
  onClose,
  selectedItems,
  groupedItems,
  quantities,
  availableItemsByKey,
  totalSelectedCount,
  totalValue,
  storageUnits = [],
  selectedDestination = null,
  setSelectedDestination,
  itemsByStorageId = {},
  currentStorageName,
  onRemove,
  setQuantity,
  touchedQuantitiesRef,
  onTransfer,
  isTransferring,
  transferError,
  transferResults,
  transferSuccess,
  getItemImageUrl
}: TransferDrawerProps) {
  const config = TRANSFER_CONFIGS[mode];
  const hasItems = selectedItems.length > 0;

  // For deposit: need destination selected
  // For withdraw: always ready (destination is inventory)
  const isReady = mode === "withdraw" ? hasItems : hasItems && !!selectedDestination;

  const Icon = mode === "withdraw" ? ArrowDownToLine : ArrowRightLeft;

  return (
    <aside
      className={cn(
        "fixed right-0 top-20 z-50 flex h-[calc(100vh-5rem)] w-full flex-col overflow-hidden border-l border-white/5 bg-[#151A25] transition-transform duration-500 ease-out will-change-[transform] sm:w-[420px] lg:w-[450px]",
        isOpen && hasItems
          ? "translate-x-0"
          : "translate-x-full pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-white/10 px-6">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold">{config.title}</span>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/60 transition hover:bg-white/5"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <TransferSummary
          selectedItems={selectedItems}
          totalSelectedCount={totalSelectedCount}
          totalValue={totalValue}
          getItemImageUrl={getItemImageUrl}
        />

        <TransferAlerts
          transferError={transferError}
          transferResults={transferResults}
          transferSuccess={transferSuccess}
        />

        <TransferSource
          config={config}
          storageUnits={storageUnits}
          selectedDestination={selectedDestination}
          setSelectedDestination={setSelectedDestination}
          itemsByStorageId={itemsByStorageId}
          currentStorageName={currentStorageName}
        />

        <TransferItemList
          groupedItems={groupedItems}
          quantities={quantities}
          availableItemsByKey={availableItemsByKey}
          getItemImageUrl={getItemImageUrl}
          onRemove={onRemove}
          setQuantity={setQuantity}
          touchedQuantitiesRef={touchedQuantitiesRef}
        />
      </div>

      {/* Footer */}
      <TransferFooter
        config={config}
        isReady={isReady}
        isTransferring={isTransferring}
        onTransfer={onTransfer}
        onClose={onClose}
      />
    </aside>
  );
}

// Re-export types
export type { TransferMode, GroupedTransferItem, TransferResult, TransferDrawerConfig } from "./types";
export { TRANSFER_CONFIGS } from "./types";
