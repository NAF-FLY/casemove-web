"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import Sidebar from "@/components/layout/Sidebar";
import Toolbar from "@/components/ui/Toolbar";
import TableContainer from "@/components/ui/TableContainer";
import InventoryTable from "@/components/inventory/InventoryTable";
import { cn } from "@/lib/utils";
import { useInventoryStore } from "@/store/inventory.store";
import { useSteamAccountsStore } from "@/store/steamAccounts.store";
import { useStorageStore } from "@/store/storage.store";
import storageUnitImage from "@/assets/images/unit-storage.png";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export default function StoragePage() {
  const activeAccountId = useSteamAccountsStore((state) => state.activeAccountId);
  const { items: inventoryItems, loading: inventoryLoading, loadInventory, isHydrated: inventoryHydrated } = useInventoryStore();
  const {
    activeStorageId,
    setActiveStorage,
    itemsByStorageId,
    loading: storageLoading,
    error: storageError,
    loadStorageItems,
    isHydrated: storageHydrated
  } = useStorageStore();

  const [collapsed, setCollapsed] = useState(false);
  const [storageSearch, setStorageSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const debouncedItemSearch = useDebouncedValue(itemSearch, itemSearch ? 300 : 0);

  // Filter only storage units from inventory
  const storageUnits = useMemo(() => {
    return inventoryItems.filter((item) => {
      const isStorageUnit =
        item.marketHashName.startsWith("Storage Unit") ||
        item.schema?.name?.startsWith("Storage Unit");
      return isStorageUnit;
    });
  }, [inventoryItems]);

  // Filter storage units by search
  const filteredStorageUnits = useMemo(() => {
    if (!storageSearch.trim()) {
      return storageUnits;
    }
    const search = storageSearch.toLowerCase();
    return storageUnits.filter((item) => {
      const name = getStorageName(item.marketHashName).toLowerCase();
      return name.includes(search);
    });
  }, [storageUnits, storageSearch]);

  // Auto-select first storage when loaded
  useEffect(() => {
    if (storageUnits.length > 0 && !activeStorageId) {
      setActiveStorage(storageUnits[0].id);
    }
  }, [storageUnits, activeStorageId, setActiveStorage]);

  // Get current storage unit info
  const activeStorage = useMemo(() => {
    return storageUnits.find((s) => s.id === activeStorageId) ?? null;
  }, [storageUnits, activeStorageId]);

  // Get items for active storage
  const storageItemsCache = activeStorageId ? itemsByStorageId[activeStorageId] : null;
  const storageItems = storageItemsCache?.items ?? [];

  // Filter items by search
  const filteredStorageItems = useMemo(() => {
    if (!debouncedItemSearch.trim()) {
      return storageItems;
    }
    const tokens = debouncedItemSearch.toLowerCase().split(/\s+/).filter(Boolean);
    return storageItems.filter((item) => {
      const searchText = [
        item.schema?.name ?? item.marketHashName,
        item.marketHashName,
        item.schema?.rarity,
        item.schema?.weapon,
        item.schema?.collection
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();
      return tokens.every((token) => searchText.includes(token));
    });
  }, [storageItems, debouncedItemSearch]);

  const { accounts, loadAccounts } = useSteamAccountsStore();

  // Ensure accounts are loaded (restore session if page refreshed)
  useEffect(() => {
    if (!activeAccountId && accounts.length === 0) {
      void loadAccounts();
    }
  }, [activeAccountId, accounts.length, loadAccounts]);

  // Load inventory to get list of storage units
  useEffect(() => {
    if (activeAccountId) {
      void loadInventory(activeAccountId);
    }
  }, [loadInventory, activeAccountId]);

  // Load storage items when active storage changes
  useEffect(() => {
    if (activeStorageId) {
      void loadStorageItems(activeStorageId);
    }
  }, [activeStorageId, loadStorageItems]);

  // Extract storage name from marketHashName (e.g., "Storage Unit | My Storage" -> "My Storage")
  const getStorageName = (marketHashName: string) => {
    const parts = marketHashName.split(" | ");
    return parts.length > 1 ? parts[1] : marketHashName;
  };

  const isLoading = inventoryLoading || storageLoading;
  const isHydrated = inventoryHydrated && storageHydrated;

  return (
    <PageContainer className="px-0">
      <div className="relative min-h-screen">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
        />
        <div
          className={cn(
            "min-h-screen transition-[margin-left] duration-300 ease-in-out",
            collapsed ? "ml-28" : "ml-72"
          )}
        >
          <AppHeader />
          <div className="mt-6 px-8 pb-8">
            {/* Two-column layout: storage list on left, content on right */}
            <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
              {/* Left: Storage Units List - sticky sidebar */}
              <div className="sticky top-20 z-20 flex flex-col gap-3 max-h-[calc(100vh-6rem)] self-start bg-background/95 py-2 backdrop-blur-sm">
                {/* Storage search - matching main toolbar styling */}
                <div className="flex items-center rounded-2xl border border-border/50 bg-card px-4 py-3">
                  <input
                    type="text"
                    placeholder="Search storages..."
                    value={storageSearch}
                    onChange={(e) => setStorageSearch(e.target.value)}
                    className="w-full h-10 rounded-xl border border-border/60 bg-background/70 px-3 text-sm placeholder:text-muted-foreground focus:border-primary/80 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto flex-1">
                  {inventoryLoading || !inventoryHydrated ? (
                    <div className="rounded-xl border border-border/40 bg-card px-4 py-3 text-sm text-muted-foreground animate-pulse">
                      Loading...
                    </div>
                  ) : filteredStorageUnits.length === 0 ? (
                    <div className="rounded-xl border border-border/40 bg-card px-4 py-3 text-sm text-muted-foreground">
                      {storageSearch ? "No matching storages" : "No storage units found"}
                    </div>
                  ) : (
                    filteredStorageUnits.map((storage) => {
                      const isActive = storage.id === activeStorageId;
                      const storageName = getStorageName(storage.marketHashName);
                      const cachedItems = itemsByStorageId[storage.id];
                      const itemCount = cachedItems?.items.length;

                      return (
                        <button
                          key={storage.id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-200",
                            isActive
                              ? "border-primary bg-primary/10 text-foreground shadow-sm"
                              : "border-border/40 bg-card text-muted-foreground hover:border-border/70 hover:bg-card/80"
                          )}
                          onClick={() => setActiveStorage(storage.id)}
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
                            <span className="text-sm font-semibold truncate">
                              {storageName}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                              <span>{itemCount !== undefined ? `${itemCount} items` : "Click to load"}</span>
                              {storage.storagePrice !== undefined && storage.storagePrice > 0 && (
                                <>
                                  <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
                                  <span className="text-primary font-medium">
                                    {new Intl.NumberFormat("en-US", {
                                      style: "currency",
                                      currency: "USD",
                                    }).format(storage.storagePrice)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Content Area (Toolbar + Items) */}
              <div className="flex flex-col">
                <div className="sticky top-20 z-20 bg-background/95 py-2 backdrop-blur-sm">
                  <Toolbar
                  showSearch
                  searchPlaceholder="Search items in storage..."
                  searchValue={itemSearch}
                  onSearchChange={setItemSearch}
                  showRefresh
                  refreshLabel="Refresh"
                  refreshing={storageLoading}
                  onRefreshClick={() => activeStorageId && loadStorageItems(activeStorageId, true)}
                  showFilter={false}
                  showSort={false}
                  showViewToggle={false}
                  showStats
                  itemCount={filteredStorageItems.length}
                  totalValue={filteredStorageItems.reduce((sum, item) => sum + (item.price ?? 0), 0)}
                />
                </div>
                <TableContainer>
                  {!activeStorage ? (
                    <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                      Select a storage unit to view its contents
                    </div>
                  ) : storageLoading && storageItems.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-muted-foreground animate-pulse">
                      Loading storage contents...
                    </div>
                  ) : storageError ? (
                    <div className="px-6 py-12 text-center text-sm text-destructive">
                      {storageError}
                    </div>
                  ) : storageItems.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground mb-2">
                        {getStorageName(activeStorage.marketHashName)}
                      </p>
                      <p>This storage unit is empty</p>
                    </div>
                  ) : (
                    <InventoryTable
                      items={filteredStorageItems}
                      viewMode="grid"
                      emptyMessage={debouncedItemSearch ? "No items match your search" : "Storage is empty"}
                    />
                  )}
                </TableContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
