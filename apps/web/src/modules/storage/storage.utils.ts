export function getStorageName(marketHashName: string) {
  const parts = marketHashName.split(" | ");
  return parts.length > 1 ? parts[1] : marketHashName;
}
