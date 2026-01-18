"use client";

import { useEffect, useMemo, useState } from "react";

import InventoryTable from "@/components/inventory/InventoryTable";
import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import Sidebar from "@/components/layout/Sidebar";
import Toolbar from "@/components/ui/Toolbar";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { useInventoryStore } from "@/store/inventory.store";
import { useSteamAccountsStore } from "@/store/steamAccounts.store";

export default function StoragePage() {
  const activeAccountId = useSteamAccountsStore((state) => state.activeAccountId);
  const { items, loading, loadInventory, isHydrated } = useInventoryStore();
  const [collapsed, setCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const debouncedQuery = useDebouncedValue(
    searchQuery,
    searchQuery ? 300 : 0
  );
  const normalizedSearch = debouncedQuery.trim().toLowerCase();

  // Filter only storage units from inventory
  const storageUnits = useMemo(() => {
    return items.filter((item) => {
      const isStorageUnit =
        item.marketHashName.startsWith("Storage Unit") ||
        item.schema?.name?.startsWith("Storage Unit");
      return isStorageUnit;
    });
  }, [items]);

  // Apply search filter
  const filteredStorages = useMemo(() => {
    if (!normalizedSearch) {
      return storageUnits;
    }

    const tokens = normalizedSearch.split(/\s+/).filter(Boolean);

    return storageUnits.filter((item) => {
      const searchText = [
        item.schema?.name ?? item.marketHashName,
        item.marketHashName
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();

      return tokens.every((token) => searchText.includes(token));
    });
  }, [storageUnits, normalizedSearch]);

  const emptyMessage = normalizedSearch
    ? "No storage units match your search."
    : "No storage units found in inventory.";

  const { accounts, loadAccounts } = useSteamAccountsStore();

  // Ensure accounts are loaded (restore session if page refreshed)
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
          <div className="px-8 pb-8">
            <Toolbar
              searchPlaceholder="Search storage units..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              showRefresh
              refreshLabel="Refresh"
              refreshing={loading}
              onRefreshClick={() => loadInventory(activeAccountId, true)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showFilter
              filterLabel="Filter"
              showSort
              sortLabel="Sort"
            />
            {loading || !isHydrated ? (
              <p className="mt-4 text-sm text-muted-foreground bg-secondary/50 p-4 rounded-lg animate-pulse">
                Loading storage units...
              </p>
            ) : (
              <InventoryTable
                items={filteredStorages}
                loading={loading}
                viewMode={viewMode}
                emptyMessage={emptyMessage}
              />
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
