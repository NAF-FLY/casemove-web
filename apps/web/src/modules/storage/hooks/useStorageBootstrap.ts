import { useEffect, useRef } from "react";

import { loadStorageItems } from "@/modules/storage/storage.service";
import { useStorageStore } from "@/store/storage.store";

export type UseStorageBootstrapParams = {
  activeAccountId: string | null;
  accountsLength: number;
  loadAccounts: () => Promise<void>;
  setAccountId: (id: string | null) => void;
  loadInventory: (
    accountId: string | null,
    force?: boolean,
    options?: { cacheTtlMs?: number }
  ) => Promise<void>;
  activeStorageId: string | null;
};

export function useStorageBootstrap({
  activeAccountId,
  accountsLength,
  loadAccounts,
  setAccountId,
  loadInventory,
  activeStorageId
}: UseStorageBootstrapParams) {
  const INVENTORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const storageAccountId = useStorageStore((state) => state.accountId);
  const storageLoadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeAccountId && accountsLength === 0) {
      void loadAccounts();
    }
  }, [activeAccountId, accountsLength, loadAccounts]);

  useEffect(() => {
    setAccountId(activeAccountId);
  }, [activeAccountId, setAccountId]);

  useEffect(() => {
    if (activeAccountId) {
      void loadInventory(activeAccountId, false, {
        cacheTtlMs: INVENTORY_CACHE_TTL_MS
      });
    }
  }, [activeAccountId, loadInventory]);

  useEffect(() => {
    if (!activeStorageId || !activeAccountId || storageAccountId !== activeAccountId) {
      return;
    }
    if (storageLoadTimer.current) {
      clearTimeout(storageLoadTimer.current);
    }
    storageLoadTimer.current = setTimeout(() => {
      void loadStorageItems(activeStorageId, false, activeAccountId);
      storageLoadTimer.current = null;
    }, 200);

    return () => {
      if (storageLoadTimer.current) {
        clearTimeout(storageLoadTimer.current);
        storageLoadTimer.current = null;
      }
    };
  }, [activeStorageId, activeAccountId, storageAccountId]);
}
