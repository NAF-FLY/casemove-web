import { memo } from "react";
import { Checkbox, Tooltip } from "@heroui/react";
import Image from "next/image";

import { cn } from "@/shared/utils/utils";
import type { InventoryDisplayItem } from "../inventory.mappers";

type InventoryGridItemProps = {
  displayItem: InventoryDisplayItem;
  index: number;
  onToggle: (id: string) => void;
};

const InventoryGridItem = memo(function InventoryGridItem({
  displayItem,
  index,
  onToggle
}: InventoryGridItemProps) {
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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle(item.id);
    }
  };

  const handleToggle = () => onToggle(item.id);
  const stopPropagation = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <div
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg",
        selectedItem && "ring-2 ring-primary/40"
      )}
    >
      <div
        className={cn(
          "relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden bg-gradient-to-br",
          rarityAppearance.gradientClass
        )}
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <div
          className={cn(
            "absolute -bottom-8 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full blur-2xl",
            rarityAppearance.glowClass
          )}
        />
        <div className="absolute left-0 right-0 top-3 z-10 flex items-center justify-between px-3">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide",
              rarityAppearance.badgeClass
            )}
          >
            {displayRarity}
          </span>
          <Checkbox
            aria-label={`Select ${displayName}`}
            isSelected={selectedItem}
            radius="sm"
            onClick={stopPropagation}
            onValueChange={handleToggle}
          />
        </div>
        <div className="flex h-full w-full items-center justify-center">
          {iconUrl ? (
            <Image
              alt={displayName}
              className="h-auto w-auto object-contain drop-shadow-[0_18px_32px_rgba(0,0,0,0.45)] transition duration-300 group-hover:scale-105"
              width={192}
              height={144}
              src={iconUrl}
              priority={index < 12}
            />
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 py-3">
        <div className="flex items-center justify-between text-sm font-semibold text-foreground">
          <span className="truncate">{displayName}</span>
          {displayItem.count && displayItem.count > 1 ? (
            <span className="ml-2 shrink-0 rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
              x{displayItem.count}
            </span>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground">
          {condition ?? "Condition unknown"}
        </div>
        <div className="mt-auto flex items-center justify-between text-sm">
          <span className="font-semibold text-primary">{priceLabel}</span>
          {hasFloat && fullFloatLabel ? (
            <Tooltip content={fullFloatLabel}>
              <span className="text-xs text-muted-foreground">{floatLabel}</span>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default InventoryGridItem;
