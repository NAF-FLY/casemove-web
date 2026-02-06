"use client";

import { useCallback, useMemo } from "react";
import type { InventoryItemDTO } from "@casemove/shared-types";

import TableContainer from "@/shared/components/ui/TableContainer";
import { useInventorySelection } from "@/modules/inventory/inventorySelection.store";
import { useInventoryStore } from "@/modules/inventory/inventory.store";

import InventoryGridView from "@/modules/inventory/components/InventoryGridView";
import InventoryListView from "@/modules/inventory/components/InventoryListView";
import { buildInventoryDisplayItems } from "@/modules/inventory/inventory.mappers";

type InventoryTableProps = {
  items?: InventoryItemDTO[];
  loading?: boolean;
  error?: string | null;
  viewMode?: "grid" | "list";
  emptyMessage?: string;
  isGrouped?: boolean;
  // Selection overrides
  selectedIds?: Set<string>;
  onSelectionToggle?: (id: string) => void;
  onSelectionGroupToggle?: (ids: string[]) => void;
};

export default function InventoryTable({
  items,
  loading,
  error,
  viewMode = "grid",
  emptyMessage = "Inventory is empty or failed to load items.",
  isGrouped = false,
  selectedIds,
  onSelectionToggle,
  onSelectionGroupToggle
}: InventoryTableProps) {
  const inventorySelected = useInventorySelection((state) => state.selected);
  const inventoryToggle = useInventorySelection((state) => state.toggle);
  const inventoryToggleGroup = useInventorySelection((state) => state.toggleGroup);

  const selected = selectedIds ?? inventorySelected;
  const toggle = onSelectionToggle ?? inventoryToggle;
  const toggleGroup = onSelectionGroupToggle ?? inventoryToggleGroup;

  const storeItems = useInventoryStore((state) => state.items);
  const storeLoading = useInventoryStore((state) => state.loading);
  const storeError = useInventoryStore((state) => state.error);
  const tableItems = items ?? storeItems;
  const isLoading = loading ?? storeLoading;
  const hasError = error ?? storeError;
  const isListView = viewMode === "list";

  const displayItems = useMemo(
    () => buildInventoryDisplayItems(tableItems, selected, isGrouped),
    [tableItems, selected, isGrouped]
  );

  // When grouped, clicking toggles all items with the same marketHashName
  const handleToggle = useCallback(
    (id: string) => {
      if (!isGrouped) {
        toggle(id);
        return;
      }

      // Find the item to get its marketHashName
      const clickedItem = tableItems.find((item) => item.id === id);
      if (!clickedItem) {
        toggle(id);
        return;
      }

      // Find all items with the same marketHashName
      const groupIds = tableItems
        .filter((item) => item.marketHashName === clickedItem.marketHashName)
        .map((item) => item.id);

      toggleGroup(groupIds);
    },
    [isGrouped, tableItems, toggle, toggleGroup]
  );

  if (!isLoading && !hasError && tableItems.length === 0) {
    return (
      <TableContainer>
        <div className="px-6 py-6 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      {isListView ? (
        <InventoryListView items={displayItems} onToggle={handleToggle} />
      ) : (
        <InventoryGridView items={displayItems} onToggle={handleToggle} />
      )}
    </TableContainer>
  );
}
