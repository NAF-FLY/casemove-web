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
              "flex flex-col gap-1 rounded-2xl border border-[rgba(229,231,235,0.2)] bg-[#1B2248] px-4 py-3 text-left transition-colors",
              isActive
                ? "border-[var(--accent)] text-[var(--text)]"
                : "text-[#A1ADD6] hover:border-[rgba(229,231,235,0.35)]"
            )}
            onClick={() => onSelect(storage.id)}
            type="button"
          >
            <span className="text-sm font-semibold">{storage.name}</span>
            <span className="text-xs text-[#8E9AC4]">
              {storage.used} / {storage.capacity}
            </span>
          </button>
        );
      })}
    </div>
  );
}
