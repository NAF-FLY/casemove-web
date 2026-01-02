"use client";

import type { InventoryItemDTO } from "@casemove/shared-types";

import InventoryRow from "@/components/inventory/InventoryRow";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import TableContainer from "@/components/ui/TableContainer";
import { tableHeaderCellClass } from "@/components/ui/tableStyles";
import { cn } from "@/lib/utils";
import { useInventorySelection } from "@/store/inventorySelection.store";
import { useInventoryStore } from "@/store/inventory.store";

type InventoryTableProps = {
  items?: InventoryItemDTO[];
  loading?: boolean;
  error?: string | null;
};

export default function InventoryTable({
  items,
  loading,
  error
}: InventoryTableProps) {
  const selected = useInventorySelection((state) => state.selected);
  const toggle = useInventorySelection((state) => state.toggle);
  const storeItems = useInventoryStore((state) => state.items);
  const storeLoading = useInventoryStore((state) => state.loading);
  const storeError = useInventoryStore((state) => state.error);
  const tableItems = items ?? storeItems;
  const isLoading = loading ?? storeLoading;
  const hasError = error ?? storeError;

  if (!isLoading && !hasError && tableItems.length === 0) {
    return (
      <TableContainer className="mt-6">
        <div className="px-6 py-6 text-sm text-muted-foreground">
          Inventory is empty or failed to load items.
        </div>
      </TableContainer>
    );
  }

  return (
    <TableContainer className="mt-6">
      <Table className="w-full border-separate border-spacing-y-3">
        <TableHeader>
          <TableRow className="border-0">
            <TableHead className={cn(tableHeaderCellClass, "w-[32px] pl-4")} />
            <TableHead className={cn(tableHeaderCellClass, "w-[40px] px-2")} />
            <TableHead className={cn(tableHeaderCellClass, "px-3")}>
              Item
            </TableHead>
            <TableHead className={cn(tableHeaderCellClass, "px-3")}>
              Rarity
            </TableHead>
            <TableHead className={cn(tableHeaderCellClass, "px-3")}>
              Price
            </TableHead>
            <TableHead className={cn(tableHeaderCellClass, "pr-4")}>
              Location
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableItems.map((item) => {
            const displayName = item.schema?.name ?? item.marketHashName;
            const displayRarity = item.schema?.rarity ?? "Unknown";
            const priceLabel = "—";
            const iconUrl = item.schema?.image ?? item.iconUrl;
            const rarityDot = item.schema?.rarity ?? null;

            return (
              <InventoryRow
                key={item.id}
                item={{
                  id: item.id,
                  name: displayName,
                  rarity: displayRarity,
                  price: priceLabel,
                  location: "Inventory",
                  iconUrl,
                  rarityDot
                }}
                onToggle={toggle}
                selected={selected.has(item.id)}
              />
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
