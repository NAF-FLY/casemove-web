import type { InventoryItemDTO, StorageUnitDTO } from "@casemove/shared-types";
import { fetchWithAuth } from "./fetch-client";

export async function fetchStorages(): Promise<StorageUnitDTO[]> {
  const response = await fetchWithAuth("/api/storage");

  if (!response.ok) {
    throw new Error("Failed to fetch storages");
  }

  const data = await response.json();
  return data.units ?? [];
}

export type StorageResponse = {
  items: InventoryItemDTO[];
  totalValue: number;
  totalItems: number;
  updatedAt: string;
  fromCache: boolean;
  message?: string;
};

export type StorageDepositResult = {
  itemId: string;
  status: "ok" | "error";
  reason?: string;
};

export type StorageDepositResponse = {
  status: "ok" | "partial" | "failed";
  results: StorageDepositResult[];
};

export async function fetchStorageItems(
  storageId: string,
  forceRefresh = false
): Promise<StorageResponse> {
  const query = forceRefresh ? "?forceRefresh=true" : "";
  const response = await fetchWithAuth(`/api/storage/${storageId}${query}`);

  if (!response.ok) {
    // Handle 429 (Too Many Requests) specifically if it returns partial data
    if (response.status === 429) {
      try {
        const data = await response.json();
        if (data.items) {
          // Return data but maybe we want to propagate the warning?
          // We can attach the message to the response object if needed.
          return { ...data, message: data.message };
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || "Failed to fetch storage items");
  }

  const data = await response.json();
  // Ensure we return arrays even if empty
  return {
    items: data.items ?? [],
    totalValue: data.totalValue ?? 0,
    totalItems: data.totalItems ?? 0,
    updatedAt: data.updatedAt,
    fromCache: data.fromCache ?? false,
    message: data.message
  };
}

export async function depositToStorage(
  storageId: string,
  itemIds: string[]
): Promise<StorageDepositResponse> {
  const response = await fetchWithAuth(`/api/storage/${storageId}/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemIds })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || "Failed to deposit items");
  }

  const data = await response.json();
  return {
    status: data.status ?? "failed",
    results: data.results ?? []
  };
}
