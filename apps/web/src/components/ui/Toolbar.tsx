"use client";

import { useState, type Key } from "react";

import { Input, Switch, Tab, Tabs } from "@heroui/react";
import { ArrowUpDown, Filter, Grid2X2, List, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";

type ToolbarProps = {
  className?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showRefresh?: boolean;
  refreshLabel?: string;
  refreshing?: boolean;
  onRefreshClick?: () => void;
  showFilter?: boolean;
  filterLabel?: string;
  onFilterClick?: () => void;
  showSort?: boolean;
  sortLabel?: string;
  onSortClick?: () => void;
  showViewToggle?: boolean;
  onViewToggle?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  viewLabel?: string;
  showGrouping?: boolean;
  isGrouped?: boolean;
  onToggleGrouping?: (value: boolean) => void;
  groupingLabel?: string;
  // Stats display
  showStats?: boolean;
  itemCount?: number;
  totalValue?: number;
  valueCurrency?: string;
  // Selected items stats
  selectedCount?: number;
  selectedValue?: number;
};

export default function Toolbar({
  className,
  showSearch = true,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  showRefresh = false,
  refreshLabel = "Refresh",
  refreshing = false,
  onRefreshClick,
  showFilter = true,
  filterLabel = "Filter",
  onFilterClick,
  showSort = true,
  sortLabel = "Sort",
  onSortClick,
  showViewToggle = true,
  onViewToggle,
  viewMode,
  onViewModeChange,
  viewLabel = "Toggle view",
  showGrouping = false,
  isGrouped = false,
  onToggleGrouping,
  groupingLabel = "Group items",
  showStats = false,
  itemCount,
  totalValue,
  valueCurrency = "USD",
  selectedCount,
  selectedValue
}: ToolbarProps) {
  const formattedValue = totalValue != null
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: valueCurrency,
        minimumFractionDigits: 2
      }).format(totalValue)
    : null;
  const formattedSelectedValue = selectedValue != null
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: valueCurrency,
        minimumFractionDigits: 2
      }).format(selectedValue)
    : null;
  const hasSearch = showSearch;
  const isSearchControlled = typeof searchValue === "string";
  const isViewControlled = typeof viewMode === "string";
  const [uncontrolledViewMode, setUncontrolledViewMode] =
    useState<ViewMode>("grid");
  const activeViewMode = isViewControlled ? viewMode : uncontrolledViewMode;

  const handleViewChange = (key: Key) => {
    const nextMode = key === "list" ? "list" : "grid";

    if (!isViewControlled) {
      setUncontrolledViewMode(nextMode);
    }

    if (onViewModeChange) {
      onViewModeChange(nextMode);
      return;
    }

    if (onViewToggle) {
      onViewToggle();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3",
        !hasSearch && "justify-end",
        className
      )}
    >
      {showSearch ? (
        <Input
          aria-label={searchPlaceholder}
          className="min-w-[220px] flex-1"
          classNames={{
            inputWrapper:
              "h-10 rounded-xl !border !border-border/60 bg-background/70 data-[hover=true]:border-border/80 group-data-[focus=true]:!border-primary/80 group-data-[focus=true]:data-[hover=true]:!border-primary/80",
            input: "text-sm text-foreground"
          }}
          placeholder={searchPlaceholder}
          color="primary"
          radius="lg"
          size="sm"
          startContent={
            <Search className="h-4 w-4 text-muted-foreground" />
          }
          type="text"
          value={isSearchControlled ? searchValue : undefined}
          variant="bordered"
          isReadOnly={isSearchControlled && !onSearchChange}
          onValueChange={onSearchChange}
        />
      ) : null}
      {showStats ? (
        <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-background/50 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Value:</span>
            <span className="text-base font-semibold text-primary">
              {formattedValue ?? "—"}
            </span>
          </div>
          <div className="h-5 w-px bg-border/50" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Items:</span>
            <span className="text-base font-semibold text-foreground">
              {itemCount?.toLocaleString() ?? "—"}
            </span>
          </div>
          {(selectedCount != null && selectedCount > 0) ? (
            <>
              <div className="h-5 w-px bg-border/50" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Selected:</span>
                <span className="text-base font-semibold text-foreground">
                  {selectedCount.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-base font-semibold text-primary">
                  {formattedSelectedValue ?? "—"}
                </span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        {showRefresh ? (
          <Button
            className="h-10 gap-2 rounded-xl border-border/60 bg-background/70 px-4"
            onClick={onRefreshClick}
            type="button"
            variant="outline"
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            <span>{refreshLabel}</span>
          </Button>
        ) : null}
        {showFilter ? (
          <Button
            className="h-10 gap-2 rounded-xl border-border/60 bg-background/70 px-4"
            onClick={onFilterClick}
            type="button"
            variant="outline"
          >
            <Filter className="h-4 w-4" />
            <span>{filterLabel}</span>
          </Button>
        ) : null}
        {showSort ? (
          <Button
            className="h-10 gap-2 rounded-xl border-border/60 bg-background/70 px-4"
            onClick={onSortClick}
            type="button"
            variant="outline"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span>{sortLabel}</span>
          </Button>
        ) : null}
        {showGrouping ? (
          <div className="flex h-10 items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-4">
            <Switch
              isSelected={isGrouped}
              onValueChange={onToggleGrouping}
              size="sm"
              color="primary"
              classNames={{
                wrapper: "rounded-md group-data-[selected=true]:bg-primary",
                thumb: "rounded-sm"
              }}
            />
            <span className="text-sm">{groupingLabel}</span>
          </div>
        ) : null}
        {showViewToggle ? (
          <Tabs
            aria-label={viewLabel}
            classNames={{
              tabList:
                "h-10 gap-1 rounded-xl border border-border/60 bg-background/70 p-1",
              tab: "h-8 px-3 text-sm font-medium text-muted-foreground data-[selected=true]:text-primary-foreground data-[hover-unselected=true]:opacity-100",
              tabContent:
                "flex items-center gap-2 text-muted-foreground group-data-[selected=true]:text-primary-foreground group-data-[hover-unselected=true]:text-foreground",
              cursor: "rounded-lg"
            }}
            color="primary"
            radius="full"
            selectedKey={activeViewMode}
            size="sm"
            variant="solid"
            onSelectionChange={handleViewChange}
          >
            <Tab
              key="grid"
              title={
                <span className="flex items-center gap-2">
                  <Grid2X2 className="h-4 w-4" />
                  <span>Grid</span>
                </span>
              }
            />
            <Tab
              key="list"
              title={
                <span className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  <span>List</span>
                </span>
              }
            />
          </Tabs>
        ) : null}
      </div>
    </div>
  );
}
