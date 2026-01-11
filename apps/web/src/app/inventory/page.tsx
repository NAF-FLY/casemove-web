"use client";

import { useEffect } from "react";

import FiltersBar from "@/components/inventory/FiltersBar";
import InventoryTable from "@/components/inventory/InventoryTable";
import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import Sidebar from "@/components/layout/Sidebar";
import FloatingActionButton from "@/components/ui/FloatingActionButton";
import { useInventoryStore } from "@/store/inventory.store";
import { useInventorySelection } from "@/store/inventorySelection.store";

export default function InventoryPage() {
  const selectedCount = useInventorySelection((state) => state.selected.size);
  const { items, loading, error, loadInventory } = useInventoryStore();

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  return (
    <PageContainer className="px-0">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <AppHeader />
          <div className="px-8">
            <FiltersBar />
            {error ? (
              <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>
            ) : null}
            {loading ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Loading inventory...
              </p>
            ) : (
              <InventoryTable items={items} error={error} loading={loading} />
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
