import { memo } from "react";
import Toolbar from "@/shared/components/ui/Toolbar";

type RefreshCooldownInfo = {
  isCooldown: boolean;
  formattedRemaining: string;
};

type StorageToolbarProps = {
  itemSearch: string;
  onItemSearchChange: (value: string) => void;
  cooldownInfo: RefreshCooldownInfo;
  storageLoading: boolean;
  onRefresh: () => void;
  itemCount: number;
  totalValue: number;
  updatedAt?: string;
};

function StorageToolbar({
  itemSearch,
  onItemSearchChange,
  cooldownInfo,
  storageLoading,
  onRefresh,
  itemCount,
  totalValue,
  updatedAt
}: StorageToolbarProps) {
  return (
    <div className="sticky top-20 z-30 flex h-20 items-center justify-between border-b border-border/60 bg-[#151A25] px-8 shadow-sm transition-all">
      <Toolbar
        showSearch
        searchPlaceholder="Search items in storage..."
        searchValue={itemSearch}
        onSearchChange={onItemSearchChange}
        showRefresh
        refreshLabel={
          cooldownInfo.isCooldown ? (
            <span className="tabular-nums font-medium min-w-[3rem] text-center inline-block">
              {cooldownInfo.formattedRemaining}
            </span>
          ) : (
            "Refresh"
          )
        }
        refreshing={storageLoading}
        refreshDisabled={cooldownInfo.isCooldown}
        onRefreshClick={onRefresh}
        showFilter={false}
        showSort={false}
        showViewToggle={false}
        showStats
        itemCount={itemCount}
        totalValue={totalValue}
      />
      {updatedAt && (
        <div className="px-4 text-xs text-muted-foreground text-right">
          Updated: {new Date(updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

export default memo(StorageToolbar);
