import { X } from "lucide-react";
import type { MutableRefObject } from "react";

import Image from "next/image";
import { Button, NumberInput } from "@heroui/react";

import type { InventoryItemDTO } from "@casemove/shared-types";

import type { GroupedTransferItem } from "./types";

type TransferItemListProps = {
  groupedItems: GroupedTransferItem[];
  quantities: Record<string, number>;
  availableItemsByKey: Map<string, InventoryItemDTO[]>;
  getItemImageUrl: (item: InventoryItemDTO) => string | null;
  onRemove: (key: string) => void;
  setQuantity: (id: string, value: number) => void;
  touchedQuantitiesRef: MutableRefObject<Set<string>>;
};

export default function TransferItemList({
  groupedItems,
  quantities,
  availableItemsByKey,
  getItemImageUrl,
  onRemove,
  setQuantity,
  touchedQuantitiesRef
}: TransferItemListProps) {
  return (
    <>
      <div className="sticky top-0 z-10 border-y border-white/10 bg-slate-950/80 px-6 py-3 backdrop-blur-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Item Details
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {groupedItems.map((group) => {
          const quantity = quantities[group.key] ?? group.count;
          const availableCount =
            availableItemsByKey.get(group.key)?.length ?? group.count;
          return (
            <div
              key={group.key}
              className="group flex items-start gap-4 p-4 transition-colors hover:bg-white/5"
            >
              <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-900/80">
                {getItemImageUrl(group.item) && (
                  <Image
                    src={getItemImageUrl(group.item) as string}
                    alt={group.item.marketHashName}
                    fill
                    className="object-cover"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate text-sm font-medium">
                  <span className="truncate">{group.item.marketHashName}</span>
                </div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                  <div className="flex items-center overflow-hidden rounded-lg border border-white/10 bg-slate-900/80">
                    <NumberInput
                      minValue={1}
                      maxValue={availableCount}
                      step={1}
                      value={quantity}
                      onValueChange={(rawValue) => {
                        const nextValue = Number.isFinite(rawValue)
                          ? rawValue
                          : availableCount;
                        const clamped = Math.min(
                          Math.max(nextValue, 1),
                          availableCount
                        );
                        touchedQuantitiesRef.current.add(group.key);
                        setQuantity(group.key, clamped);
                      }}
                      className="w-14"
                      classNames={{
                        inputWrapper:
                          "h-8 min-h-0 rounded-none border-0 bg-transparent px-2 data-[hover=true]:border-0 group-data-[focus=true]:!border-0",
                        input: "text-xs text-foreground text-center"
                      }}
                      variant="bordered"
                    />
                    <div className="h-5 w-px bg-white/10" />
                    <Button
                      type="button"
                      variant="light"
                      size="sm"
                      onPress={() => {
                        touchedQuantitiesRef.current.add(group.key);
                        setQuantity(group.key, availableCount);
                      }}
                      className="h-8 rounded-none px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Max
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  className="h-6 w-6 rounded-full text-white/40 hover:bg-red-500/10 hover:text-red-400"
                  onPress={() => onRemove(group.key)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold text-emerald-400">
                    ${(group.unitValue * quantity).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    ${group.unitValue.toFixed(2)} each
                  </div>
                </div>
              </div>
            </div>

          );
        })}
      </div>
    </>
  );
}
