import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip
} from "@heroui/react";
import Image from "next/image";
import {
  tableCellBaseClass,
  tableCellLeftBorderClass,
  tableCellRightBorderClass,
  tableHeaderCellClass,
  tableRowClass
} from "@/components/ui/tableStyles";
import { cn } from "@/lib/utils";

import type { InventoryDisplayItem } from "./inventoryDisplay";

type InventoryListViewProps = {
  items: InventoryDisplayItem[];
  onToggle: (id: string) => void;
};

export default function InventoryListView({
  items,
  onToggle
}: InventoryListViewProps) {
  return (
    <Table
      aria-label="Inventory list"
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
          <span className="sr-only">Select</span>
        </TableColumn>
        <TableColumn className={cn(tableHeaderCellClass, "px-3")}>
          Item
        </TableColumn>
        <TableColumn className={cn(tableHeaderCellClass, "px-3")}>
          Rarity
        </TableColumn>
        <TableColumn className={cn(tableHeaderCellClass, "px-3")}>
          Float
        </TableColumn>
        <TableColumn className={cn(tableHeaderCellClass, "pr-4")}>
          Price
        </TableColumn>
      </TableHeader>
      <TableBody>
        {items.map(
          ({
            item,
            condition,
            displayName,
            displayRarity,
            iconUrl,
            priceLabel,
            floatLabel,
            fullFloatLabel,
            selectedItem,
            rarityAppearance,
            hasFloat
          }) => (
            <TableRow
              key={item.id}
              className={tableRowClass}
              data-state={selectedItem ? "selected" : undefined}
            >
              <TableCell
                className={cn(
                  tableCellBaseClass,
                  tableCellLeftBorderClass,
                  "w-[40px] rounded-l-xl pl-4"
                )}
              >
                <Checkbox
                  aria-label={`Select ${displayName}`}
                  isSelected={selectedItem}
                  radius="sm"
                  onClick={(event) => event.stopPropagation()}
                  onValueChange={() => onToggle(item.id)}
                />
              </TableCell>
              <TableCell className={cn(tableCellBaseClass, "px-3")}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-background/70">
                    {iconUrl ? (
                      <Image
                        alt={displayName}
                        className="h-8 w-8 rounded-md object-contain"
                        height={32}
                        sizes="32px"
                        src={iconUrl}
                        width={32}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {displayName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {condition ?? "Condition unknown"}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className={cn(tableCellBaseClass, "px-3")}>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                    rarityAppearance.badgeClass
                  )}
                >
                  {displayRarity}
                </span>
              </TableCell>
              <TableCell
                className={cn(tableCellBaseClass, "px-3 text-muted-foreground")}
              >
                {hasFloat && fullFloatLabel ? (
                  <Tooltip content={fullFloatLabel}>
                    <span className="text-xs text-muted-foreground">
                      {floatLabel}
                    </span>
                  </Tooltip>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {floatLabel}
                  </span>
                )}
              </TableCell>
              <TableCell
                className={cn(
                  tableCellBaseClass,
                  tableCellRightBorderClass,
                  "rounded-r-xl px-4 font-semibold text-primary"
                )}
              >
                {priceLabel}
              </TableCell>
            </TableRow>
          )
        )}
      </TableBody>
    </Table>
  );
}
