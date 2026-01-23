// This file is deprecated and no longer used.
// Storage logic has been moved to storage/routes.ts and uses direct SteamClient calls.
// Keeping this file temporarily to avoid breaking unresolved imports if any exist.

export async function getStorageUnitsMock() {
  return [];
}

export async function getStorageItemsMock(storageId: string) {
  return [];
}
