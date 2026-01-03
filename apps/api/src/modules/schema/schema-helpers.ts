export type SchemaItem = { id: string };

export function matchesTypeHint(
  item: SchemaItem | null,
  typeHint: string | null
): boolean {
  if (!item || !typeHint) {
    return false;
  }
  const normalized = typeHint.toLowerCase();
  if (normalized.includes("graffiti") || normalized.includes("spray")) {
    return item.id.startsWith("graffiti-");
  }
  if (normalized.includes("music kit") || normalized.includes("musickit")) {
    return item.id.startsWith("music_kit-");
  }
  if (normalized.includes("sticker")) {
    return item.id.startsWith("sticker-") || item.id.startsWith("sticker_slab-");
  }
  if (
    normalized.includes("case") ||
    normalized.includes("container") ||
    normalized.includes("capsule") ||
    normalized.includes("package") ||
    normalized.includes("crate")
  ) {
    return item.id.startsWith("crate-");
  }
  return false;
}

export function getSchemaItemPriority(item: SchemaItem | null): number {
  if (!item) {
    return 0;
  }
  const id = item.id.toLowerCase();
  if (id.startsWith("music_kit-") || id.startsWith("music-kit-")) {
    return 50;
  }
  if (
    id.startsWith("weapon-") ||
    id.startsWith("skin-") ||
    id.startsWith("agent-") ||
    id.startsWith("glove-") ||
    id.startsWith("gloves-") ||
    id.startsWith("crate-") ||
    id.startsWith("case-") ||
    id.startsWith("tool-") ||
    id.startsWith("collectible-") ||
    id.startsWith("pin-") ||
    id.startsWith("patch-") ||
    id.startsWith("keychain-")
  ) {
    return 40;
  }
  if (id.startsWith("sticker-") || id.startsWith("sticker_slab-")) {
    return 10;
  }
  if (id.startsWith("graffiti-")) {
    return 10;
  }
  return 20;
}
