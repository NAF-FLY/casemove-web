import { useMemo, useRef, useState } from "react";
import { addToast } from "@heroui/react";

import type { InventoryItemDTO } from "@casemove/shared-types";

import { useInventoryStore } from "@/modules/inventory/inventory.store";
import { useInventorySelection } from "@/modules/inventory/inventorySelection.store";
import { useStorageStore } from "@/modules/storage/storage.store";

import { type GroupedTransferItem } from "@/shared/components/TransferDrawer/types";
import { getItemImageUrl } from "./inventory.utils";

export function useInventoryDeposit() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferResults, setTransferResults] = useState<any[] | null>(null); 
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  
  // Selection State
  const { selected, quantities, setQuantity, clear: clearSelection } = useInventorySelection();
  const selectedDestination = useInventorySelection((state) => state.selectedDestination);
  const setSelectedDestination = useInventorySelection((state) => state.setSelectedDestination);

  // Data Sources
  const inventoryItems = useInventoryStore((state) => state.items);
  const depositToStorage = useInventoryStore((state) => state.depositToStorage);
  const itemsByStorageId = useStorageStore((state) => state.itemsByStorageId);
  const storageUnits = useMemo(() => {
    return inventoryItems.filter(
      (item) =>
        item.marketHashName.startsWith("Storage Unit") ||
        item.schema?.name?.startsWith("Storage Unit")
    );
  }, [inventoryItems]);

  const touchedQuantitiesRef = useRef<Set<string>>(new Set());

  // Derived Data
  const selectedItems = useMemo(() => {
    return inventoryItems.filter((item) => selected.has(item.id));
  }, [inventoryItems, selected]);

  const availableItemsByKey = useMemo(() => {
    const map = new Map<string, InventoryItemDTO[]>();
    for (const item of inventoryItems) {
      if (item.moveable && !selected.has(item.id)) { // Logic check: actually we want ALL available items of this type, including selected?
        // In withdraw logic we filtered out selected? No.
        // Let's stick to simple grouping of ALL items of that type that COULD be selected.
        // Actually, usually we want to show "Available: X".
        // Let's group ALL inventory items by hash name.
      }
      const key = item.marketHashName;
      const existing = map.get(key);
      if (existing) {
        existing.push(item);
      } else {
        map.set(key, [item]);
      }
    }
    return map;
  }, [inventoryItems]); // Re-calculating on every item change is heavy but okay for now

  const groupedItems = useMemo(() => {
    const map = new Map<string, GroupedTransferItem>();
    
    // Iterate over SELECTED items to form groups
    for (const item of selectedItems) {
      const key = item.marketHashName;
      // Price logic
      let unitValue = item.price ?? 0;
      if (item.priceCurrency !== 'USD') unitValue = 0; // simplified

      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { key, item, count: 1, unitValue });
      }
    }

    return Array.from(map.values());
  }, [selectedItems]);

  // Sync quantities (if selection changes externally)
  // Logic from useTransferItemDrawer: 
  // If quantities[key] is not set, default to group.count.
  // Actually, useInventorySelection stores quantities. 
  // We should rely on store or sync?
  // In `useStorageWithdrawal`, we relied on store `quantities`.
  // Here we use `quantities` from store.

  const totalSelectedCount = groupedItems.reduce((sum, group) => {
    const qty = quantities[group.key] ?? group.count;
    return sum + qty;
  }, 0);

  const totalValue = groupedItems.reduce((sum, group) => {
    const qty = quantities[group.key] ?? group.count;
    return sum + group.unitValue * qty;
  }, 0);


  
  const toggleGroupWrapper = (ids: string[]) => {
      useInventorySelection.getState().toggleGroup(ids);
  }

  const handleDeposit = async () => {
    if (!selectedDestination) return;
    
    setIsTransferring(true);
    setTransferError(null);
    setTransferResults(null);
    setTransferSuccess(null);

    try {
      // Determine explicit item IDs based on quantities
      const itemIdsToTransfer: string[] = [];

      for (const group of groupedItems) {
        const qty = quantities[group.key] ?? group.count;
        // Get all available items of this type
        const allOfThisType = availableItemsByKey.get(group.key) ?? [];

        // Logic: prioritize selected items, then unselected
        // We know the total count of selected items is group.count
        const selectedCountTotal = group.count;
        const neededSelected = Math.min(qty, selectedCountTotal);
        const neededUnselected = Math.max(0, qty - selectedCountTotal);

        let collectedSelected = 0;
        let collectedUnselected = 0;

        for (const item of allOfThisType) {
          // Optimization: stop early if we have enough of both
          if (
            collectedSelected >= neededSelected &&
            collectedUnselected >= neededUnselected
          ) {
            break;
          }

          const isSelected = selected.has(item.id);
          if (isSelected) {
            if (collectedSelected < neededSelected) {
              itemIdsToTransfer.push(item.id);
              collectedSelected++;
            }
          } else {
            if (collectedUnselected < neededUnselected) {
              itemIdsToTransfer.push(item.id);
              collectedUnselected++;
            }
          }
        }
      }

      if (itemIdsToTransfer.length === 0) return;

      const response = await depositToStorage(selectedDestination, itemIdsToTransfer);

      if (response.status === "ok") {
        setTransferSuccess("Items moved successfully");
        addToast({ title: "Success", description: "Items moved to storage", color: "success" });
        clearSelection();
        setTimeout(() => setIsDrawerOpen(false), 2000);
      } else if (response.status === "partial") {
         setTransferResults(response.results.filter(r => r.status === 'error').map(r => ({
             itemId: r.itemId,
             name: inventoryItems.find(i => i.id === r.itemId)?.marketHashName ?? r.itemId,
             reason: r.reason
         })));
         clearSelection(); // Clear selection even on partial? usually yes.
      } else {
         setTransferError("Failed to deposit items");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setTransferError(msg);
      addToast({ title: "Error", description: msg, color: "danger" });
    } finally {
      setIsTransferring(false);
    }
  };

  const openDrawer = () => {
    if (selected.size > 0) {
        setIsDrawerOpen(true);
    }
  };

  return {
    isDrawerOpen,
    setIsDrawerOpen,
    openDrawer,
    
    // Data
    groupedItems,
    selectedItems,
    availableItemsByKey,
    quantities,
    setQuantity,
    onRemove: (key: string) => toggleGroupWrapper(availableItemsByKey.get(key)?.filter(i => selected.has(i.id)).map(i => i.id) || []),
    touchedQuantitiesRef,
    
    totalSelectedCount,
    totalValue,
    
    // Deposit specific
    storageUnits,
    selectedDestination,
    setSelectedDestination,
    itemsByStorageId,
    
    // Handlers
    handleDeposit,
    isTransferring,
    transferResults,
    transferError,
    transferSuccess,
    
    getItemImageUrl,
    selectionCount: selected.size
  };
}
