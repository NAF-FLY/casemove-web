import type { InventoryItemDTO } from "@casemove/shared-types";

export async function fetchInventory(): Promise<InventoryItemDTO[]> {
  const res = await fetch("/api/inventory");

  if (!res.ok) {
    throw new Error("Failed to load inventory");
  }

  const data = await res.json();
  return data.items ?? [];
}
