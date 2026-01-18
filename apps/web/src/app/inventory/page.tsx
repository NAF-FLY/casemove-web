"use client";

import { useEffect, useMemo, useState } from "react";

import InventoryTable from "@/components/inventory/InventoryTable";
import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import Sidebar from "@/components/layout/Sidebar";
import FloatingActionButton from "@/components/ui/FloatingActionButton";
import Toolbar from "@/components/ui/Toolbar";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { useInventoryStore } from "@/store/inventory.store";
import { useInventorySelection } from "@/store/inventorySelection.store";
import { useSteamAccountsStore } from "@/store/steamAccounts.store";

export default function InventoryPage() {
  const selectedCount = useInventorySelection((state) => state.selected.size);
  const activeAccountId = useSteamAccountsStore((state) => state.activeAccountId);
  const { items, loading, error, loadInventory } = useInventoryStore();
  const [collapsed, setCollapsed] = useState(false);
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
              searchPlaceholder="Search items by name, type, or rarity..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              showRefresh
              refreshLabel="Refresh"
              refreshing={loading}
              onRefreshClick={() => loadInventory(activeAccountId, true)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
            {error ? (
              <p className="mt-4 text-sm text-destructive">{error}</p>
            ) : null}
            {loading ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Loading inventory...
              </p>
            ) : (
              <InventoryTable
                items={filteredItems}
                error={error}
                loading={loading}
                viewMode={viewMode}
                emptyMessage={emptyMessage}
              />
            )}
          </div>
          <FloatingActionButton
            label="Move selected →"
            onClick={() => {}}
            visible={selectedCount > 0}
          />
        </div>
      </div>
    </PageContainer>
  );
}
