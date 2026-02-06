import type { InventoryItemDTO } from "@casemove/shared-types";
import { fetchWithAuth } from "./fetch.client";

export async function fetchInventory(
  forceRefresh = false,
  cacheTtlMs?: number
): Promise<InventoryItemDTO[]> {
  const params = new URLSearchParams();
  if (forceRefresh) {
    params.set("forceRefresh", "true");
  }
  if (cacheTtlMs !== undefined) {
    params.set("cacheTtlMs", String(cacheTtlMs));
  }
  const query = params.toString();
  const url = query ? `/api/inventory?${query}` : "/api/inventory";
  const res = await fetchWithAuth(url);

  if (!res.ok) {
    throw new Error("Failed to load inventory");
  }

  const data = await res.json();
  return data.items ?? [];
}
