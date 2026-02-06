import type { InventoryItemDTO } from "@casemove/shared-types";

import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import TableContainer from "@/shared/components/ui/TableContainer";
import {
  tableCellBaseClass,
  tableCellLeftBorderClass,
  tableCellRightBorderClass,
  tableHeaderCellClass,
  tableRowClass
} from "@/shared/components/ui/tableStyles";
import { getRarityClass } from "@/modules/inventory/inventory.styles";
import { cn } from "@/shared/utils/utils";

type StorageItemsTableProps = {
  items: InventoryItemDTO[];
};

export default function StorageItemsTable({ items }: StorageItemsTableProps) {
  return (
    <TableContainer>
      <Table
        aria-label="Storage items"
        classNames={{
          base: "gap-0",
          wrapper: "overflow-auto bg-transparent p-0 shadow-none",
          table: "w-full border-separate border-spacing-y-3",
          thead: "after:content-none",
          tbody: "after:content-none",
          th: "bg-transparent"
        }}
      >
        <TableHeader>
          <TableColumn className={cn(tableHeaderCellClass, "w-[40px] pl-4")}>
            <span className="sr-only">Icon</span>
          </TableColumn>
          <TableColumn className={cn(tableHeaderCellClass, "px-3")}>
            Item
          </TableColumn>
          <TableColumn className={cn(tableHeaderCellClass, "px-3")}>
            Rarity
          </TableColumn>
          <TableColumn className={cn(tableHeaderCellClass, "pr-4")}>
            Price
          </TableColumn>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const displayName = item.schema?.name ?? item.marketHashName;
            const displayRarity = item.schema?.rarity ?? "Unknown";
            const priceLabel = "—";

            return (
              <TableRow key={item.id} className={tableRowClass}>
                <TableCell
                  className={cn(
                    tableCellBaseClass,
                    tableCellLeftBorderClass,
                    "w-[40px] rounded-l-xl pl-4"
                  )}
                >
                  <div className="h-9 w-9 rounded-md border border-border bg-secondary" />
                </TableCell>
                <TableCell
                  className={cn(tableCellBaseClass, "px-3 text-left font-normal")}
                >
                  {displayName}
                </TableCell>
                <TableCell
                  className={cn(
                    tableCellBaseClass,
                    "px-3 text-left font-normal",
                    getRarityClass(displayRarity)
                  )}
                >
                  {displayRarity}
                </TableCell>
                <TableCell
                  className={cn(
                    tableCellBaseClass,
                    tableCellRightBorderClass,
                    "rounded-r-xl px-4 text-left font-normal text-muted-foreground"
                  )}
                >
                  {priceLabel}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
