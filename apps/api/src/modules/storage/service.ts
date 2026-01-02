import type { InventoryItemDTO, StorageUnitDTO } from "@casemove/shared-types";

export async function getStorageUnitsMock(): Promise<StorageUnitDTO[]> {
  return [
    { id: "storage_01", name: "Main Storage", capacity: 200, used: 156 },
    { id: "storage_02", name: "Trade Vault", capacity: 120, used: 44 },
    { id: "storage_03", name: "Sticker Box", capacity: 80, used: 62 },
    { id: "storage_04", name: "Low Tier", capacity: 300, used: 210 }
  ];
}

export async function getStorageItemsMock(
  storageId: string
): Promise<InventoryItemDTO[]> {
  const itemsByStorage: Record<string, InventoryItemDTO[]> = {
    storage_01: [
      {
        id: "stg1_001",
        appId: 730,
        marketHashName: "AK-47 | Blue Laminate",
        iconUrl: "https://example.com/icons/ak47-blue-laminate.png",
        moveable: true,
        tradable: true,
        schema: {
          id: "skin-ak47-blue-laminate",
          name: "AK-47 | Blue Laminate",
          rarity: "Restricted",
          weapon: "AK-47",
          collection: "The Arms Deal Collection",
          image: "https://example.com/icons/ak47-blue-laminate.png"
        }
      },
      {
        id: "stg1_002",
        appId: 730,
        marketHashName: "M4A1-S | Basilisk",
        iconUrl: "https://example.com/icons/m4a1s-basilisk.png",
        moveable: true,
        tradable: true,
        schema: {
          id: "skin-m4a1s-basilisk",
          name: "M4A1-S | Basilisk",
          rarity: "Mil-Spec",
          weapon: "M4A1-S",
          collection: "The Huntsman Collection",
          image: "https://example.com/icons/m4a1s-basilisk.png"
        }
      }
    ],
    storage_02: [
      {
        id: "stg2_001",
        appId: 730,
        marketHashName: "USP-S | Cortex",
        iconUrl: "https://example.com/icons/usp-cortex.png",
        moveable: true,
        tradable: false,
        schema: {
          id: "skin-usp-cortex",
          name: "USP-S | Cortex",
          rarity: "Covert",
          weapon: "USP-S",
          collection: "The Clutch Collection",
          image: "https://example.com/icons/usp-cortex.png"
        }
      },
      {
        id: "stg2_002",
        appId: 730,
        marketHashName: "AWP | Fever Dream",
        iconUrl: "https://example.com/icons/awp-fever-dream.png",
        moveable: true,
        tradable: true,
        schema: {
          id: "skin-awp-fever-dream",
          name: "AWP | Fever Dream",
          rarity: "Classified",
          weapon: "AWP",
          collection: "The Spectrum Collection",
          image: "https://example.com/icons/awp-fever-dream.png"
        }
      }
    ],
    storage_03: [
      {
        id: "stg3_001",
        appId: 730,
        marketHashName: "Sticker | Dragon Lore (Foil)",
        iconUrl: "https://example.com/icons/sticker-dragon-lore.png",
        moveable: true,
        tradable: true,
        schema: {
          id: "sticker-dragon-lore-foil",
          name: "Sticker | Dragon Lore (Foil)",
          rarity: "Contraband",
          weapon: null,
          collection: null,
          image: "https://example.com/icons/sticker-dragon-lore.png"
        }
      },
      {
        id: "stg3_002",
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
    ],
    storage_04: [
      {
        id: "stg4_001",
        appId: 730,
        marketHashName: "Glock-18 | Weasel",
        iconUrl: "https://example.com/icons/glock-weasel.png",
        moveable: true,
        tradable: true,
        schema: {
          id: "skin-glock-weasel",
          name: "Glock-18 | Weasel",
          rarity: "Mil-Spec",
          weapon: "Glock-18",
          collection: "The Wildfire Collection",
          image: "https://example.com/icons/glock-weasel.png"
        }
      },
      {
        id: "stg4_002",
        appId: 730,
        marketHashName: "Nova | Caged Steel",
        iconUrl: "https://example.com/icons/nova-caged-steel.png",
        moveable: true,
        tradable: true,
        schema: {
          id: "skin-nova-caged-steel",
          name: "Nova | Caged Steel",
          rarity: "Mil-Spec",
          weapon: "Nova",
          collection: "The Nuke Collection",
          image: "https://example.com/icons/nova-caged-steel.png"
        }
      }
    ]
  };

  return itemsByStorage[storageId] ?? [];
}
