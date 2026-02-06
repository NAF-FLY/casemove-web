"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import InventoryTable from "@/modules/inventory/components/InventoryTable";
import FloatingActionButton from "@/shared/components/ui/FloatingActionButton";
import TransferDrawer from "@/shared/components/TransferDrawer";
import Toolbar from "@/shared/components/ui/Toolbar";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useInventoryStore } from "@/modules/inventory/inventory.store";
import { useSteamAccountsStore } from "@/modules/profile/steamAccounts.store";
import { useInventoryDeposit } from "@/modules/inventory/useInventoryDeposit";
import { useRefetchOnFocus } from "@/shared/hooks/useRefetchOnFocus";

export default function InventoryPage() {
  const activeAccountId = useSteamAccountsStore((state) => state.activeAccountId);
  const { accounts, loadAccounts } = useSteamAccountsStore();
  const { items, loading, error, loadInventory, isHydrated, isGrouped, toggleGrouped } = useInventoryStore();

  const {
    openDrawer,
    isDrawerOpen,
    setIsDrawerOpen,
    
    // Data
    groupedItems,
    availableItemsByKey,
    quantities,
    setQuantity,
    onRemove,
    touchedQuantitiesRef,
    
    totalSelectedCount,
    totalValue,

    // Deposit specific
    storageUnits,
    selectedDestination,
    setSelectedDestination,
    itemsByStorageId,
    
    // Handlers
    handleDeposit,
    isTransferring,
    transferResults,
    transferError,
    transferSuccess,
    
    getItemImageUrl,
    selectionCount,
    selectedItems
  } = useInventoryDeposit();

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

  const emptyMessage = normalizedSearch
    ? "No items match your search."
    : "Inventory is empty or failed to load items.";

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
          <div className="sticky top-20 z-30 flex h-20 items-center border-b border-border/60 bg-[#151A25] px-8">
            <div className="w-full">
              <Toolbar
                searchPlaceholder="Search items by name, type, or rarity..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                showStats
                itemCount={filteredItems.length}
                totalValue={filteredItems.reduce((sum, item) => sum + (item.price ?? 0), 0)}
                storageValue={filteredItems.reduce((sum, item) => sum + (item.storagePrice ?? 0), 0)}
                selectedCount={selectionCount}
                selectedValue={totalValue}
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
          onClick={openDrawer}
          visible={selectionCount > 0}
        />
      </div>
      <TransferDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        mode="deposit"
        selectedItems={selectedItems}
        groupedItems={groupedItems}
        availableItemsByKey={availableItemsByKey}
        quantities={quantities}
        setQuantity={setQuantity}
        onRemove={onRemove}
        touchedQuantitiesRef={touchedQuantitiesRef}
        totalSelectedCount={totalSelectedCount}
        totalValue={totalValue}
        storageUnits={storageUnits}
        selectedDestination={selectedDestination}
        setSelectedDestination={setSelectedDestination}
        itemsByStorageId={itemsByStorageId}
        onTransfer={handleDeposit}
        isTransferring={isTransferring}
        transferResults={transferResults}
        transferError={transferError}
        transferSuccess={transferSuccess}
        getItemImageUrl={getItemImageUrl}
      />
    </div>
  );
}
