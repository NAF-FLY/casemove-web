import type { InventoryItemDTO } from "@casemove/shared-types";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import TableContainer from "@/components/ui/TableContainer";
import {
  tableCellBaseClass,
  tableCellLeftBorderClass,
  tableCellRightBorderClass,
  tableHeaderCellClass,
  tableRowClass
} from "@/components/ui/tableStyles";
import { cn } from "@/lib/utils";

type StorageItemsTableProps = {
  items: InventoryItemDTO[];
};

function getRarityClass(rarity: string) {
  if (rarity === "Covert") {
    return "text-[var(--danger)]";
  }

  if (rarity === "Classified") {
    return "text-[var(--accent)]";
  }

  return "text-[var(--text-muted)]";
}

export default function StorageItemsTable({ items }: StorageItemsTableProps) {
  return (
    <TableContainer>
      <Table className="w-full border-separate border-spacing-y-3">
        <TableHeader>
          <TableRow className="border-0">
            <TableHead className={cn(tableHeaderCellClass, "w-[40px] pl-4")} />
            <TableHead className={cn(tableHeaderCellClass, "px-3")}>
              Item
            </TableHead>
            <TableHead className={cn(tableHeaderCellClass, "px-3")}>
              Rarity
            </TableHead>
            <TableHead className={cn(tableHeaderCellClass, "pr-4")}>
              Price
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const displayName = item.schema?.name ?? item.marketHashName;
            const displayRarity = item.schema?.rarity ?? "Unknown";
            const priceLabel = "—";

            return (
              <TableRow key={item.id} className={tableRowClass}>
                <TableHead
                  className={cn(
                    tableCellBaseClass,
                    tableCellLeftBorderClass,
                    "w-[40px] rounded-l-xl pl-4"
                  )}
                >
                  <div className="h-9 w-9 rounded-md border border-[var(--border)] bg-[var(--panel-soft)]" />
                </TableHead>
                <TableHead className={cn(tableCellBaseClass, "px-3 text-left font-normal")}>
                  {displayName}
                </TableHead>
                <TableHead
                  className={cn(
                    tableCellBaseClass,
                    "px-3 text-left font-normal",
                    getRarityClass(displayRarity)
                  )}
                >
                  {displayRarity}
                </TableHead>
                <TableHead
                  className={cn(
                    tableCellBaseClass,
                    tableCellRightBorderClass,
                    "rounded-r-xl px-4 text-left font-normal text-[#A1ADD6]"
                  )}
                >
                  {priceLabel}
                </TableHead>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
