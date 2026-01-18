"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import Sidebar from "@/components/layout/Sidebar";
import Toolbar from "@/components/ui/Toolbar";
import TableContainer from "@/components/ui/TableContainer";
import { cn } from "@/lib/utils";
import { useInventoryStore } from "@/store/inventory.store";
import { useSteamAccountsStore } from "@/store/steamAccounts.store";
import storageUnitImage from "@/assets/images/unit-storage.png";

export default function StoragePage() {
  const activeAccountId = useSteamAccountsStore((state) => state.activeAccountId);
  const { items, loading, loadInventory, isHydrated } = useInventoryStore();
  const [collapsed, setCollapsed] = useState(false);
  const [activeStorageId, setActiveStorageId] = useState<string | null>(null);
  const [storageSearch, setStorageSearch] = useState("");

  // Filter only storage units from inventory
  const storageUnits = useMemo(() => {
    return items.filter((item) => {
      const isStorageUnit =
        item.marketHashName.startsWith("Storage Unit") ||
        item.schema?.name?.startsWith("Storage Unit");
      return isStorageUnit;
    });
  }, [items]);

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
      setActiveStorageId(storageUnits[0].id);
    }
  }, [storageUnits, activeStorageId]);

  const activeStorage = useMemo(() => {
    return storageUnits.find((s) => s.id === activeStorageId) ?? null;
  }, [storageUnits, activeStorageId]);

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

  // Extract storage name from marketHashName (e.g., "Storage Unit | My Storage" -> "My Storage")
  const getStorageName = (marketHashName: string) => {
    const parts = marketHashName.split(" | ");
    return parts.length > 1 ? parts[1] : marketHashName;
  };

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
            {/* Two-column layout: storage list on left, content on right */}
            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[280px_1fr]">
              {/* Left: Storage Units List */}
              <div className="flex flex-col gap-3">
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
                <div className="flex flex-col gap-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
                  {loading || !isHydrated ? (
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

                      return (
                        <button
                          key={storage.id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-200",
                            isActive
                              ? "border-primary bg-primary/10 text-foreground shadow-sm"
                              : "border-border/40 bg-card text-muted-foreground hover:border-border/70 hover:bg-card/80"
                          )}
                          onClick={() => setActiveStorageId(storage.id)}
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
                            <span className="text-xs text-muted-foreground/80">
                              ID: {storage.id.slice(0, 8)}...
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Content Area (Toolbar + Items) */}
              <div className="flex flex-col">
                <Toolbar
                  showSearch
                  searchPlaceholder="Search items in storage..."
                  showRefresh
                  refreshLabel="Refresh"
                  refreshing={loading}
                  onRefreshClick={() => loadInventory(activeAccountId, true)}
                  showFilter={false}
                  showSort={false}
                  showViewToggle={false}
                  showStats={false}
                />
                <TableContainer className="mt-4 flex-1">
                  {!activeStorage ? (
                    <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                      Select a storage unit to view its contents
                    </div>
                  ) : (
                    <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground mb-2">
                        {getStorageName(activeStorage.marketHashName)}
                      </p>
                      <p>Storage contents will be displayed here</p>
                      <p className="mt-2 text-xs opacity-70">
                        (Coming soon)
                      </p>
                    </div>
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
