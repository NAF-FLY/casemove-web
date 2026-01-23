"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import InventoryTable from "@/components/inventory/InventoryTable";
import FloatingActionButton from "@/components/ui/FloatingActionButton";
import TransferItemDrawer from "@/components/inventory/TransferItemDrawer";
import Toolbar from "@/components/ui/Toolbar";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInventoryStore } from "@/store/inventory.store";
import { useInventorySelection } from "@/store/inventorySelection.store";
import { useSteamAccountsStore } from "@/store/steamAccounts.store";

import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";

export default function InventoryPage() {
  const selected = useInventorySelection((state) => state.selected);
  const selectedCount = selected.size;
  const activeAccountId = useSteamAccountsStore((state) => state.activeAccountId);
  const { items, loading, error, loadInventory, isHydrated, isGrouped, toggleGrouped } = useInventoryStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(
    searchQuery,
    searchQuery ? 300 : 0
  );
  const normalizedSearch = debouncedQuery.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!normalizedSearch) {
      return items;
    }

    const tokens = normalizedSearch.split(/\s+/).filter(Boolean);

    return items.filter((item) => {
      const schema = item.schema;
      const searchText = [
        schema?.name ?? item.marketHashName,
        item.marketHashName,
        schema?.rarity,
        schema?.weapon,
        schema?.collection
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();

      return tokens.every((token) => searchText.includes(token));
    });
  }, [items, normalizedSearch]);

  const storageUnits = useMemo(() => {
    return items.filter((item) =>
      item.marketHashName.startsWith("Storage Unit") ||
      item.schema?.name?.startsWith("Storage Unit")
    );
  }, [items]);
  const emptyMessage = normalizedSearch
    ? "No items match your search."
    : "Inventory is empty or failed to load items.";

  const selectedValue = useMemo(() => {
    return items
      .filter((item) => selected.has(item.id))
      .reduce((sum, item) => {
        const price = (item.price && item.price > 0) ? item.price : (item.storagePrice ?? 0);
        return sum + price;
      }, 0);
  }, [items, selected]);

  const { accounts, loadAccounts } = useSteamAccountsStore();

  useEffect(() => {
    if (!activeAccountId && accounts.length === 0) {
      void loadAccounts();
    }
  }, [activeAccountId, accounts.length, loadAccounts]);

  useEffect(() => {
    if (activeAccountId) {
      void loadInventory(activeAccountId);
    }
  }, [loadInventory, activeAccountId]);

  const handleRefetch = useCallback(() => {
    if (activeAccountId) {
      void loadInventory(activeAccountId);
    }
  }, [activeAccountId, loadInventory]);

  useRefetchOnFocus(handleRefetch);

  return (
    <div className="flex w-full items-start">
      <div className="min-w-0 flex-1">
        <div className="mt-0 pb-8">
          <div className="sticky top-0 z-30 flex h-20 items-center border-b border-border/60 bg-[#151A25] px-8">
            <div className="w-full">
              <Toolbar
              searchPlaceholder="Search items by name, type, or rarity..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              showStats
              itemCount={filteredItems.length}
              totalValue={filteredItems.reduce((sum, item) => sum + (item.price ?? 0), 0)}
              storageValue={filteredItems.reduce((sum, item) => sum + (item.storagePrice ?? 0), 0)}
              selectedCount={selectedCount}
              selectedValue={selectedValue}
              showRefresh
              refreshLabel="Refresh"
              refreshing={loading}
              onRefreshClick={() => loadInventory(activeAccountId, true)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showGrouping
              isGrouped={isGrouped}
              onToggleGrouping={toggleGrouped}
            />
            </div>
          </div>
          <div className="px-8 mt-6">
          {error ? (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          ) : null}
          {loading || !isHydrated ? (
            <p className="mt-4 text-sm text-muted-foreground bg-secondary/50 p-4 rounded-lg animate-pulse">
              Loading inventory...
            </p>
          ) : (
            <InventoryTable
              items={filteredItems}
              error={error}
              loading={loading}
              viewMode={viewMode}
              emptyMessage={emptyMessage}
              isGrouped={isGrouped}
            />
          )}
        </div>
        </div>
        <FloatingActionButton
          label="Move selected →"
          onClick={() => setIsDrawerOpen(true)}
          visible={selectedCount > 0}
        />
      </div>
      <TransferItemDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedItems={items.filter(item => selected.has(item.id))}
        allItems={items}
        storageUnits={storageUnits}
      />
    </div>
  );
}
