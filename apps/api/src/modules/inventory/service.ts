import type { InventoryItemDTO } from "@casemove/shared-types";

export function getInventoryMock(): InventoryItemDTO[] {
  return [
    {
      id: "inv_001",
      appId: 730,
      marketHashName: "AK-47 | Redline",
      iconUrl: "https://example.com/icons/ak47-redline.png",
      moveable: true,
      tradable: true,
      schema: {
        id: "skin-ak47-redline",
        name: "AK-47 | Redline",
        rarity: "Classified",
        weapon: "AK-47",
        collection: "The Phoenix Collection",
        image: "https://example.com/icons/ak47-redline.png"
      }
    },
    {
      id: "inv_002",
      appId: 730,
      marketHashName: "Glock-18 | Fade",
      iconUrl: "https://example.com/icons/glock-fade.png",
      moveable: true,
      tradable: false,
      schema: {
        id: "skin-glock-fade",
        name: "Glock-18 | Fade",
        rarity: "Covert",
        weapon: "Glock-18",
        collection: "The Assault Collection",
        image: "https://example.com/icons/glock-fade.png"
      }
    },
    {
      id: "inv_003",
      appId: 730,
      marketHashName: "Sticker | Crown (Foil)",
      iconUrl: "https://example.com/icons/sticker-crown.png",
      moveable: true,
      tradable: true,
      schema: {
        id: "sticker-crown-foil",
        name: "Sticker | Crown (Foil)",
        rarity: "Contraband",
        weapon: null,
        collection: null,
        image: "https://example.com/icons/sticker-crown.png"
      }
    }
  ];
}
