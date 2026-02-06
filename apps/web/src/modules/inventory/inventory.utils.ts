import type { InventoryItemDTO } from "@casemove/shared-types";

export const getItemImageUrl = (item: InventoryItemDTO) => {
  const image = item.schema?.image ?? item.iconUrl;
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `https://community.cloudflare.steamstatic.com/economy/image/${image}/360fx360f`;
};
