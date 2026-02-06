import { memo } from "react";
import Image from "next/image";

import type { InventoryItemDTO } from "@casemove/shared-types";
import { cn } from "@/shared/utils/utils";
import { storageCurrencyFormatter } from "@/modules/storage/storage.formatters";
import { getStorageName } from "@/modules/storage/storage.utils";
import storageUnitImage from "@/assets/images/unit-storage.png";

type StorageSidebarItemProps = {
  storage: InventoryItemDTO;
  isActive: boolean;
  cachedCount?: number;
  onSelect: (id: string) => void;
};

function StorageSidebarItem({
  storage,
  isActive,
  cachedCount,
  onSelect
}: StorageSidebarItemProps) {
  const storageName = getStorageName(storage.marketHashName);
  const itemCount = cachedCount ?? storage.storageItemsCount;

  return (
    <button
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-200",
        isActive
          ? "border-primary bg-primary/10 text-foreground shadow-sm"
          : "border-border/40 bg-card text-muted-foreground hover:border-border/70 hover:bg-card/80"
      )}
      onClick={() => onSelect(storage.id)}
      type="button"
    >
      <Image
        src={storageUnitImage}
        alt="Storage Unit"
        width={48}
        height={48}
        className="shrink-0"
      />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-semibold truncate">{storageName}</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
          <span>
            {itemCount !== undefined ? `${itemCount} items` : "Click to load"}
          </span>
          {storage.storagePrice && storage.storagePrice > 0 && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
              <span className="text-primary font-medium">
                {storageCurrencyFormatter.format(storage.storagePrice)}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

export default memo(StorageSidebarItem);
