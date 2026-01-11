import type { InventoryItemDTO, StorageUnitDTO } from "@casemove/shared-types";

export async function fetchStorages(): Promise<StorageUnitDTO[]> {
  const response = await fetch("/api/storage");

  if (!response.ok) {
    throw new Error("Failed to fetch storages");
  }

  const data = await response.json();
  return data.units ?? [];
}

export async function fetchStorageItems(
  storageId: string
): Promise<InventoryItemDTO[]> {
  const response = await fetch(`/api/storage/${storageId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch storage items");
  }

  const data = await response.json();
  return data.items ?? [];
}
