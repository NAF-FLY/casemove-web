"use client";

import { useEffect, useState } from "react";

import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import Sidebar from "@/components/layout/Sidebar";
import StorageSidebar from "@/components/storage/StorageSidebar";
import StorageItemsTable from "@/components/storage/StorageItemsTable";
import { Button } from "@/components/ui/button";
import TableContainer from "@/components/ui/TableContainer";
import { cn } from "@/lib/utils";
import { useStorageStore } from "@/store/storage.store";

export default function StoragePage() {
  const storages = useStorageStore((state) => state.storages);
  const activeStorageId = useStorageStore((state) => state.activeStorageId);
  const itemsByStorageId = useStorageStore((state) => state.itemsByStorageId);
  const loading = useStorageStore((state) => state.loading);
  const loadStorages = useStorageStore((state) => state.loadStorages);
  const loadStorageItems = useStorageStore((state) => state.loadStorageItems);
  const setActiveStorage = useStorageStore((state) => state.setActiveStorage);
  const [collapsed, setCollapsed] = useState(false);

  const activeItems = activeStorageId
    ? itemsByStorageId[activeStorageId]
    : undefined;
  const isItemsLoading = Boolean(
    loading && activeStorageId && !activeItems
  );

  useEffect(() => {
    if (activeStorageId) {
      void loadStorageItems(activeStorageId);
    }
  }, [activeStorageId, loadStorageItems]);

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
          <div className="px-8">
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => {
                  void loadStorages();
                }}
                type="button"
                variant="outline"
              >
                Load storages
              </Button>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
              <StorageSidebar
                activeStorageId={activeStorageId}
                onSelect={setActiveStorage}
                storages={storages}
              />
              <div>
                {storages.length === 0 ? (
                  <TableContainer className="border border-border/40 bg-card px-4 py-6 text-sm text-muted-foreground">
                    No storage units
                  </TableContainer>
                ) : isItemsLoading ? (
                  <TableContainer className="border border-border/40 bg-card px-4 py-6 text-sm text-muted-foreground">
                    Loading...
                  </TableContainer>
                ) : (
                  <StorageItemsTable items={activeItems ?? []} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
