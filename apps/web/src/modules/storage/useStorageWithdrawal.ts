import { useState } from "react";
import { addToast } from "@heroui/react";


import { useStorageSelection } from "@/modules/storage/storageSelection.store";
import { useStorageStore } from "@/modules/storage/storage.store";
import type { TransferResult } from "@/shared/components/TransferDrawer/types";
import { getItemImageUrl } from "../inventory/inventory.utils";



export function useStorageWithdrawal() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferResults, setTransferResults] = useState<TransferResult[] | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  const { selected, quantities, toggle, clear } = useStorageSelection();
  const { withdrawItems, activeStorageId, itemsByStorageId } = useStorageStore();

  const currentStorage = activeStorageId ? itemsByStorageId[activeStorageId] : null;

  // Derive selection details
  const storageItems = currentStorage?.items ?? [];
  const selectedItems = storageItems.filter((i) => selected.has(i.id));

  // Compute totals
  const totalSelectedCount = selectedItems.reduce((sum, item) => {
    return sum + (quantities[item.id] ?? 1);
  }, 0);

  const totalValue = selectedItems.reduce((sum, item) => {
    const qty = quantities[item.id] ?? 1;
    return sum + (item.price ?? 0) * qty;
  }, 0);

  // Grouping logic (simplified for now, assuming unique items or basic grouping)
  // For storage items, they are unique instances. We can group by marketHashName for display.
  // But withdrawal is by ID.
  // Let's reuse the grouping structure for display consistency

  
  // Actually, let's just map selected items directly to groups
  // Since storage items are individual assets (usually), we treat them as groups of 1
  const mappedGroups = selectedItems.map(item => ({
      key: item.id,
      item,
      count: 1,
      unitValue: item.price ?? 0
  }));

  const handleWithdraw = async () => {
    if (!activeStorageId) return;
    
    setIsTransferring(true);
    setTransferError(null);
    setTransferResults(null);

    try {
      // Logic for splitting transfer if needed (e.g. batching)
      // For now, simple batch
      const itemIds = Array.from(selected);
      
      const response = await withdrawItems(activeStorageId, itemIds);

      if (response.status === "failed") {
        setTransferError("Failed to withdraw items. Please try again.");
      } else if (response.status === "partial") {
         setTransferResults(response.results.filter((r: any) => r.status === "error").map((r: any) => ({
             itemId: r.itemId,
             name: selectedItems.find(i => i.id === r.itemId)?.marketHashName ?? "Unknown Item",
             reason: r.reason
         })));
         addToast({ title: "Warning", description: "Some items could not be withdrawn.", color: "warning" });
         // Clear successfully moved items from selection
         const successIds = response.results.filter((r: any) => r.status === "ok").map((r: any) => r.itemId);
         successIds.forEach((id: string) => toggle(id));
      } else {
         addToast({ title: "Success", description: "Items withdrawn successfully", color: "success" });
         clear();
         setIsDrawerOpen(false);
         // Optionally refresh inventory cache via store?
         // useInventoryStore.getState().fetchInventory(...) 
         // But allow backend cache invalidation to propogate first
      }

    } catch (error) {
       console.error(error);
       setTransferError("An unexpected error occurred.");
       addToast({ title: "Error", description: "Failed to withdraw items", color: "danger" });
    } finally {
      setIsTransferring(false);
    }
  };

  const openDrawer = () => {
    if (selected.size === 0) {
        addToast({ title: "Notice", description: "Select items to withdraw first", color: "default" });
        return;
    }
    setIsDrawerOpen(true);
  };

  return {
    isDrawerOpen,
    setIsDrawerOpen,
    openDrawer,
    selectedItems,
    groupedItems: mappedGroups,
    quantities: {}, // No quantity editing for storage items (usually 1:1)
    availableItemsByKey: new Map(selectedItems.map(i => [i.id, [i]])), // Mock map
    totalSelectedCount,
    totalValue,
    
    // Handlers
    onRemove: (key: string) => toggle(key),
    setQuantity: () => {}, // No-op
    touchedQuantitiesRef: { current: new Set<string>() }, // Mock
    
    handleWithdraw,
    isTransferring,
    transferError,
    transferResults,
    
    // Utils
    getItemImageUrl,
    
    // Selection state for external use
    selectionCount: selected.size
  };
}
