import type { InventoryItemDTO } from "@casemove/shared-types";

export function getInventoryMock(): InventoryItemDTO[] {
  return [
    {
      id: "inv_001",
      name: "AK-47 | Redline",
      type: "Rifle",
      rarity: "Classified",
      iconUrl: "https://example.com/icons/ak47-redline.png",
      price: 12.5,
      tradable: true,
      storageId: null
    },
    {
      id: "inv_002",
      name: "Glock-18 | Fade",
      type: "Pistol",
      rarity: "Covert",
      iconUrl: "https://example.com/icons/glock-fade.png",
      price: 320.0,
      tradable: false,
      storageId: "storage_01"
    },
    {
      id: "inv_003",
      name: "Sticker | Crown (Foil)",
      type: "Sticker",
      rarity: "Contraband",
      iconUrl: "https://example.com/icons/sticker-crown.png",
      price: null,
      tradable: true,
      storageId: null
    }
  ];
}
