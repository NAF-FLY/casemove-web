export type InventoryItemSchemaDTO = {
  id: string;
  name: string;
  rarity: string | null;
  weapon: string | null;
  collection: string | null;
  image: string | null;
};

export type InventoryItemDTO = {
  id: string;
  appId: number;
  marketHashName: string;
  iconUrl: string | null;
  moveable: boolean;
  tradable: boolean;
  paintWear?: number | null;
  price?: number | null;
  priceCurrency?: string | null;
  schema?: InventoryItemSchemaDTO | null;
};
