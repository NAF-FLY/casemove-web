"use client";

import type { InventoryItemDTO } from "@casemove/shared-types";

import TableContainer from "@/components/ui/TableContainer";
import { useInventorySelection } from "@/store/inventorySelection.store";
import { useInventoryStore } from "@/store/inventory.store";

import InventoryGridView from "@/components/inventory/InventoryGridView";
import InventoryListView from "@/components/inventory/InventoryListView";
import { buildInventoryDisplayItems } from "@/components/inventory/inventoryDisplay";

type InventoryTableProps = {
  items?: InventoryItemDTO[];
  loading?: boolean;
  error?: string | null;
  viewMode?: "grid" | "list";
  emptyMessage?: string;
};

export default function InventoryTable({
  items,
  loading,
  error,
  viewMode = "grid",
  emptyMessage = "Inventory is empty or failed to load items."
}: InventoryTableProps) {
  const selected = useInventorySelection((state) => state.selected);
  const toggle = useInventorySelection((state) => state.toggle);
  const storeItems = useInventoryStore((state) => state.items);
  const storeLoading = useInventoryStore((state) => state.loading);
  const storeError = useInventoryStore((state) => state.error);
  const tableItems = items ?? storeItems;
  const isLoading = loading ?? storeLoading;
  const hasError = error ?? storeError;
  const isListView = viewMode === "list";

  const displayItems = buildInventoryDisplayItems(tableItems, selected);

  if (!isLoading && !hasError && tableItems.length === 0) {
    return (
      <TableContainer className="mt-6">
        <div className="px-6 py-6 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      </TableContainer>
    );
  }

  return (
    <TableContainer className="mt-6">
      {isListView ? (
        <InventoryListView items={displayItems} onToggle={toggle} />
      ) : (
        <InventoryGridView items={displayItems} onToggle={toggle} />
      )}
    </TableContainer>
  );
}
