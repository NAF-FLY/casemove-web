import Image from "next/image";

import type { InventoryItemDTO } from "@casemove/shared-types";

type TransferSummaryProps = {
  selectedItems: InventoryItemDTO[];
  totalSelectedCount: number;
  totalValue: number;
  getItemImageUrl: (item: InventoryItemDTO) => string | null;
};

export default function TransferSummary({
  selectedItems,
  totalSelectedCount,
  totalValue,
  getItemImageUrl
}: TransferSummaryProps) {
  return (
    <div className="p-6 pb-0">
      <div className="rounded-2xl border border-primary/20 bg-[#1B2535] p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Selection
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {totalSelectedCount} Items
            </div>

            <div className="mt-3 flex -space-x-2">
              {selectedItems.slice(0, 5).map((item, idx) => (
                <div
                  key={item.id}
                  className="relative h-9 w-9 overflow-hidden rounded-full border border-white/20 bg-slate-900"
                  style={{ zIndex: 5 - idx }}
                >
                  {getItemImageUrl(item) && (
                    <Image
                      src={getItemImageUrl(item) as string}
                      alt={item.marketHashName}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
              ))}
              {selectedItems.length > 5 && (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-800 text-xs font-semibold text-slate-200"
                  style={{ zIndex: 0 }}
                >
                  +{selectedItems.length - 5}
                </div>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Value
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-400">
              ${totalValue.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
