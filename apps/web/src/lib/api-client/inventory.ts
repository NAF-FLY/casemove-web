import type { InventoryItemDTO } from "@casemove/shared-types";

export async function fetchInventory(forceRefresh = false): Promise<InventoryItemDTO[]> {
  const url = forceRefresh ? "/api/inventory?forceRefresh=true" : "/api/inventory";
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to load inventory");
  }

  const data = await res.json();
  return data.items ?? [];
}
