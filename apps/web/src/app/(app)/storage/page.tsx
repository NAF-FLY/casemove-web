"use client";

import { useState } from "react";
import { shallow } from "zustand/shallow";

import StorageContentPanel from "@/components/storage/StorageContentPanel";
import StorageListPanel from "@/components/storage/StorageListPanel";
import StorageToolbar from "@/components/storage/StorageToolbar";
import { loadStorageItems } from "@/modules/storage/storage.service";
import { useRefreshCooldown } from "@/modules/storage/hooks/useRefreshCooldown";
import { useStorageBootstrap } from "@/modules/storage/hooks/useStorageBootstrap";
import { useStorageItems } from "@/modules/storage/hooks/useStorageItems";
import { useStorageNotifications } from "@/modules/storage/hooks/useStorageNotifications";
import { useStorageUnits } from "@/modules/storage/hooks/useStorageUnits";
import {
  useInventoryCore,
  useStorageCore,
  useStorageReadiness
} from "@/modules/storage/storage.selectors";
import { useSteamAccountsStore } from "@/store/steamAccounts.store";

export default function StoragePage() {
  const { activeAccountId, accounts, loadAccounts } = useSteamAccountsStore(
    (state) => ({
      activeAccountId: state.activeAccountId,
      accounts: state.accounts,
      loadAccounts: state.loadAccounts
    }),
    shallow
  );
  const {
    items: inventoryItems,
    loadInventory
  } = useInventoryCore();
  const { isReady, inventoryLoading } = useStorageReadiness();
  const {
    activeStorageId,
    setActiveStorage,
    itemsByStorageId,
    loading: storageLoading,
    error: storageError,
    warning: storageWarning,
    setAccountId
  } = useStorageCore();

  const [storageSearch, setStorageSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const { filteredStorageUnits, activeStorage } = useStorageUnits({
    inventoryItems,
    storageSearch,
    activeStorageId,
    setActiveStorage
  });
  const {
    storageItems,
    filteredStorageItems,
    updatedAt,
    totalValue,
    debouncedItemSearch
  } = useStorageItems({ activeStorageId, itemsByStorageId, itemSearch });
  const storageItemsCache = activeStorageId
    ? itemsByStorageId[activeStorageId]
    : undefined;
  const [cooldownStarts, setCooldownStarts] = useState<Record<string, number>>(
    {}
  );
  const cooldownStartAt = activeStorageId
    ? cooldownStarts[activeStorageId]
    : undefined;
  const cooldownInfo = useRefreshCooldown(cooldownStartAt);
  useStorageNotifications();

  useStorageBootstrap({
    activeAccountId,
    accountsLength: accounts.length,
    loadAccounts,
    setAccountId,
    loadInventory,
    activeStorageId
  });

  return (
    <div className="mt-0 px-8 pb-8">
      {/* Two-column layout: storage list on left, content on right */}
      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left: Storage Units List - sticky sidebar */}
        <StorageListPanel
          storageSearch={storageSearch}
          onStorageSearchChange={setStorageSearch}
          inventoryLoading={inventoryLoading}
          inventoryHydrated={isReady}
          filteredStorageUnits={filteredStorageUnits}
          activeStorageId={activeStorageId}
          itemsByStorageId={itemsByStorageId}
          onSelectStorage={setActiveStorage}
        />

        {/* Right: Content Area (Toolbar + Items) */}
        <div className="flex flex-col">
          <StorageToolbar
            itemSearch={itemSearch}
            onItemSearchChange={setItemSearch}
            cooldownInfo={cooldownInfo}
            storageLoading={storageLoading}
            onRefresh={() => {
              if (!activeStorageId) {
                return;
              }
              void (async () => {
                const response = await loadStorageItems(
                  activeStorageId,
                  true,
                  activeAccountId
                );
                if (response) {
                  setCooldownStarts((prev) => ({
                    ...prev,
                    [activeStorageId]: Date.now()
                  }));
                }
              })();
            }}
            itemCount={filteredStorageItems.length}
            totalValue={totalValue}
            updatedAt={updatedAt}
          />
          <StorageContentPanel
            activeStorage={activeStorage}
            storageLoading={storageLoading}
            storageItems={storageItems}
            filteredStorageItems={filteredStorageItems}
            debouncedItemSearch={debouncedItemSearch}
            storageWarning={storageWarning}
            storageError={storageError}
            isReady={isReady}
            hasStorageCache={Boolean(storageItemsCache)}
          />
        </div>
      </div>
    </div>
  );
}
