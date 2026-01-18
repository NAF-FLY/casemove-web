import {
  Checkbox,
  Tooltip
} from "@heroui/react";
import Image from "next/image";
import { Virtuoso } from "react-virtuoso";
import {
  tableHeaderCellClass
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
    <div className="h-full w-full">
      <div className="flex w-full items-center border-b border-border/40 pb-2 pl-4 pr-4">
        <div className={cn(tableHeaderCellClass, "w-[40px]")}>
          <span className="sr-only">Select</span>
        </div>
        <div className={cn(tableHeaderCellClass, "flex-1 px-3")}>Item</div>
        <div className={cn(tableHeaderCellClass, "w-[120px] px-3")}>
          Rarity
        </div>
        <div className={cn(tableHeaderCellClass, "w-[100px] px-3")}>float</div>
        <div className={cn(tableHeaderCellClass, "w-[100px] text-right")}>
          Price
        </div>
      </div>
      <Virtuoso
        useWindowScroll
        className="w-full scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/40 hover:scrollbar-thumb-border/60"
        data={items}
        overscan={400}
        itemContent={(index, displayItem) => {
          const {
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
          } = displayItem;

          return (
            <div
              key={item.id}
              className={cn(
                "group flex w-full items-center border-b border-border/40 py-2 transition-colors hover:bg-muted/50 pl-4 pr-4",
                selectedItem && "bg-muted/50"
              )}
              role="button"
              tabIndex={0}
              onClick={() => onToggle(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggle(item.id);
                }
              }}
            >
              <div className="w-[40px] flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  aria-label={`Select ${displayName}`}
                  isSelected={selectedItem}
                  radius="sm"
                  onValueChange={() => onToggle(item.id)}
                />
              </div>

              <div className="flex flex-1 items-center gap-3 px-3 min-w-0">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/70">
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center text-sm font-semibold text-foreground">
                    <span className="truncate">{displayName}</span>
                    {displayItem.count && displayItem.count > 1 ? (
                      <span className="ml-2 shrink-0 rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                        x{displayItem.count}
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {condition ?? "Condition unknown"}
                  </div>
                </div>
              </div>

              <div className="w-[120px] flex-shrink-0 px-3">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    rarityAppearance.badgeClass
                  )}
                >
                  {displayRarity}
                </span>
              </div>

              <div className="w-[100px] flex-shrink-0 px-3 text-muted-foreground">
                {hasFloat && fullFloatLabel ? (
                  <Tooltip content={fullFloatLabel}>
                    <span className="cursor-help text-xs text-muted-foreground">
                      {floatLabel}
                    </span>
                  </Tooltip>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {floatLabel}
                  </span>
                )}
              </div>

              <div className="w-[100px] flex-shrink-0 text-right font-semibold text-primary">
                {priceLabel}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
