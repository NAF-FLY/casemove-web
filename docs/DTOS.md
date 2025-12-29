# DTO — Морфология данных проекта

```ts
export interface InventoryItemDTO {
  id: string;
  name: string;
  type: string;
  rarity: string;
  iconUrl: string;
  price: number | null;
  tradable: boolean;
  storageId: string | null;
}

export interface StorageUnitDTO {
  id: string;
  name: string;
  capacity: number;
  used: number;
}

export interface BulkMoveRequestDTO {
  from: string;
  to: string;
  filter?: BulkFilterDTO;
  limit?: number | null;
}
```
