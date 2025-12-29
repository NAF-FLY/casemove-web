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
