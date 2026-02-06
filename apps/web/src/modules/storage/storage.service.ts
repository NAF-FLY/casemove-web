import { fetchStorageItems } from "@/core/api-client/storage.client";
import { useInventoryStore } from "@/modules/inventory/inventory.store";
import { useStorageStore } from "@/modules/storage/storage.store";
import { mapStorageResponseToCache } from "@/modules/storage/storage.mappers";

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (client side cache check)
const WARNING_AUTO_DISMISS_MS = 5 * 1000;
let warningTimer: ReturnType<typeof setTimeout> | null = null;

function setWarningWithAutoDismiss(message: string) {
  const storageState = useStorageStore.getState();
  storageState.setWarning(message);
  if (warningTimer) {
    clearTimeout(warningTimer);
  }
  warningTimer = setTimeout(() => {
    useStorageStore.getState().clearWarning();
    warningTimer = null;
  }, WARNING_AUTO_DISMISS_MS);
}

export async function loadStorageItems(
  storageId: string,
  force = false,
  expectedAccountId?: string | null
) {
  const storageState = useStorageStore.getState();
  if (!storageState.accountId) {
    return null;
  }
  if (
    expectedAccountId !== undefined &&
    expectedAccountId !== storageState.accountId
  ) {
    return null;
  }
  const cached = storageState.itemsByStorageId[storageId];
  const now = Date.now();

  if (storageState.loadingStorageId === storageId) {
    return null;
  }

  if (!force && cached && now - cached.lastUpdated < CACHE_DURATION) {
    return null;
  }

  storageState.setLoading(true, storageId);
  storageState.setError(null);
  storageState.setWarning(null);

  try {
    const response = await fetchStorageItems(storageId, force);
    const existingCache = useStorageStore.getState().itemsByStorageId[storageId];

    if (response.items.length === 0 && existingCache?.items.length) {
      console.warn(
        "[StorageService] API returned 0 items while cache has items, keeping cached data"
      );
      useStorageStore.getState().setLoading(false);
      useStorageStore
        .getState()
        .setError("Steam returned incomplete data, showing cached items");
      return response;
    }

    if (response.message) {
      setWarningWithAutoDismiss(response.message);
    }

    if (response.totalValue !== undefined) {
      useInventoryStore.getState().updateItem(storageId, {
        storagePrice: response.totalValue,
        storageItemsCount: response.totalItems
      });
    }

    useStorageStore
      .getState()
      .setStorageItems(storageId, mapStorageResponseToCache(response));

    useStorageStore.getState().setLoading(false);
    return response;
  } catch (error) {
    useStorageStore.getState().setLoading(false);
    useStorageStore
      .getState()
      .setError(error instanceof Error ? error.message : "Failed to load storage items");
    return null;
  }
}
