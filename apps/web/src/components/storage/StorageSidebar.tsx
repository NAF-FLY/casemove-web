import type { StorageUnitDTO } from "@casemove/shared-types";

import { cn } from "@/lib/utils";

type StorageSidebarProps = {
  storages: StorageUnitDTO[];
  activeStorageId: string | null;
  onSelect: (id: string) => void;
};

export default function StorageSidebar({
  storages,
  activeStorageId,
  onSelect
}: StorageSidebarProps) {
  return (
    <div className="flex flex-col gap-3">
      {storages.map((storage) => {
        const isActive = storage.id === activeStorageId;

        return (
          <button
            key={storage.id}
            className={cn(
              "flex flex-col gap-1 rounded-2xl border border-border/40 bg-card px-4 py-3 text-left transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:border-border/70"
            )}
            onClick={() => onSelect(storage.id)}
            type="button"
          >
            <span className="text-sm font-semibold">{storage.name}</span>
            <span className="text-xs text-muted-foreground/80">
              {storage.used} / {storage.capacity}
            </span>
          </button>
        );
      })}
    </div>
  );
}
