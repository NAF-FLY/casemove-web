import type { InventoryItemDTO } from "@casemove/shared-types";

export type RarityAppearance = {
  badgeClass: string;
  gradientClass: string;
  glowClass: string;
};

export type InventoryDisplayItem = {
  item: InventoryItemDTO;
  condition: string | null;
  displayName: string;
  displayRarity: string;
  iconUrl?: string | null;
  priceLabel: string;
  floatLabel: string;
  fullFloatLabel: string | null;
  selectedItem: boolean;
  rarityAppearance: RarityAppearance;
  hasFloat: boolean;
  count?: number;
};

function getRarityAppearance(rarity: string | null | undefined): RarityAppearance {
  switch (rarity) {
    case "Covert":
      return {
        badgeClass:
          "border-[#ff6b6b]/40 bg-[#4b1717]/70 text-[#ffb3b3]",
        gradientClass: "from-[#3e1515] via-[#2a0f0f] to-[#120808]",
        glowClass: "bg-[#ff5b5b]/25"
      };
    case "Extraordinary":
      return {
        badgeClass:
          "border-[#eb4b4b] bg-[#402d2d] text-[#ffd2d2]",
        gradientClass: "from-[#3a1a1a] via-[#2a1414] to-[#140a0a]",
        glowClass: "bg-[#eb4b4b]/25"
      };
    case "Classified":
      return {
        badgeClass:
          "border-[#ff7bd6]/40 bg-[#4a1b3c]/70 text-[#ffc2ea]",
        gradientClass: "from-[#35142b] via-[#24101f] to-[#130a12]",
        glowClass: "bg-[#ff5fd6]/25"
      };
    case "Restricted":
      return {
        badgeClass:
          "border-[#b68cff]/40 bg-[#2f1c4a]/70 text-[#d8c1ff]",
        gradientClass: "from-[#2c1941] via-[#1c1230] to-[#110a1f]",
        glowClass: "bg-[#a874ff]/25"
      };
    case "Mil-Spec":
      return {
        badgeClass:
          "border-[#6ea8ff]/40 bg-[#173055]/70 text-[#b7d3ff]",
        gradientClass: "from-[#14253c] via-[#0e1a2c] to-[#0a111d]",
        glowClass: "bg-[#5a9bff]/25"
      };
    case "Industrial":
      return {
        badgeClass:
          "border-[#5e98d9] bg-[#2f363e] text-[#cfe3ff]",
        gradientClass: "from-[#12333b] via-[#0c242c] to-[#07171f]",
        glowClass: "bg-[#45cdd2]/25"
      };
    case "Consumer":
      return {
        badgeClass:
          "border-[#c8d0d8]/40 bg-[#1a2328]/70 text-[#e1e6eb]",
        gradientClass: "from-[#1e252a] via-[#151b20] to-[#0b0f13]",
        glowClass: "bg-[#aeb7bf]/20"
      };
    case "Contraband":
      return {
        badgeClass:
          "border-[#ffcc7a]/40 bg-[#3d2b12]/70 text-[#ffe0a6]",
        gradientClass: "from-[#3a2a12] via-[#251b0c] to-[#140f08]",
        glowClass: "bg-[#ffb347]/25"
      };
    case "High":
      return {
        badgeClass:
          "border-[#4b69ff] bg-[#2d3042] text-[#c8d1ff]",
        gradientClass: "from-[#20263a] via-[#171b2b] to-[#0d101b]",
        glowClass: "bg-[#4b69ff]/25"
      };
    default:
      return {
        badgeClass: "border-white/10 bg-white/5 text-white/70",
        gradientClass: "from-[#1a2129] via-[#141b23] to-[#0b0f14]",
        glowClass: "bg-white/10"
      };
  }
}

function getNameAndCondition(marketHashName: string) {
  const match = marketHashName.match(/\(([^)]+)\)$/);

  if (!match) {
    return { name: marketHashName, condition: null };
  }

  return {
    name: marketHashName.replace(/\s*\([^)]+\)$/, "").trim(),
    condition: match[1]
  };
}

function getCleanRarity(rarity: string | null | undefined) {
  if (!rarity) {
    return null;
  }

  return rarity.replace(/\s*Grade$/i, "").trim();
}

export function buildInventoryDisplayItems(
  items: InventoryItemDTO[],
  selected: Set<string>,
  isGrouped: boolean = false
): InventoryDisplayItem[] {
  const displayItems = items.map((item) => {
    const { name, condition } = getNameAndCondition(item.marketHashName);
    const displayName = item.schema?.name ?? name;
    const cleanedRarity = getCleanRarity(item.schema?.rarity);
    const displayRarity = cleanedRarity ?? "Unknown";
    const iconUrl = item.schema?.image ?? item.iconUrl;
    const priceLabel =
      item.price && typeof item.price === "number"
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: item.priceCurrency ?? "USD"
          }).format(item.price)
        : "—";
    const floatValue = item.paintWear;
    const hasFloat =
      typeof floatValue === "number" && Number.isFinite(floatValue);
    const floatLabel = hasFloat ? `${floatValue.toFixed(2)} Float` : "— Float";
    const fullFloatLabel = hasFloat ? String(floatValue) : null;
    const selectedItem = selected.has(item.id);
    const rarityAppearance = getRarityAppearance(cleanedRarity);

    return {
      item,
      condition,
      displayName,
      displayRarity,
      iconUrl,
      priceLabel,
      floatLabel,
      fullFloatLabel,
      selectedItem,
      rarityAppearance,
      hasFloat,
      count: 1
    };
  });

  if (!isGrouped) {
    return displayItems;
  }

  const groupedMap = new Map<string, InventoryDisplayItem>();

  for (const displayItem of displayItems) {
    const key = displayItem.item.marketHashName;
    const existing = groupedMap.get(key);

    if (existing) {
      existing.count = (existing.count ?? 0) + 1;
      // If any item in the group is selected, consider the group selected?
      // Or just track selection of the representative?
      // Current logic: representative selection state is what matters.
      // But if we want enabling selection to work properly, we might need a derived selection state.
      // For now, let's just stick to simple grouping.
      // Maybe simpler: if the incoming item is selected, mark the group as selected.
      if (displayItem.selectedItem) {
        existing.selectedItem = true;
      }
    } else {
      groupedMap.set(key, { ...displayItem });
    }
  }

  return Array.from(groupedMap.values());
}
