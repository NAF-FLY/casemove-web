import type { InventoryItemDTO, StorageUnitDTO } from "@casemove/shared-types";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  const token = localStorage.getItem("casemove_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchStorages(): Promise<StorageUnitDTO[]> {
  const response = await fetch("/api/storage", {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    throw new Error("Failed to fetch storages");
  }

  const data = await response.json();
  return data.units ?? [];
}

export async function fetchStorageItems(
  storageId: string
): Promise<InventoryItemDTO[]> {
  const response = await fetch(`/api/storage/${storageId}`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    throw new Error("Failed to fetch storage items");
  }

  const data = await response.json();
  return data.items ?? [];
}
