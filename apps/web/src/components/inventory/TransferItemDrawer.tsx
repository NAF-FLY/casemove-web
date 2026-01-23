import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X, ArrowRightLeft, Wallet, Check, FolderInput } from "lucide-react";
import Image from "next/image";

import { Alert, NumberInput, Select, SelectItem } from "@heroui/react";
import { Button } from "@/components/ui/button";
import type { InventoryItemDTO } from "@casemove/shared-types";
import { useInventorySelection } from "@/store/inventorySelection.store";
import { useInventoryStore } from "@/store/inventory.store";
import { useStorageStore } from "@/store/storage.store";
import { getStorageName } from "@/modules/storage/storage.utils";
import { cn } from "@/lib/utils";

interface TransferItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: InventoryItemDTO[];
  allItems: InventoryItemDTO[];
  storageUnits: InventoryItemDTO[];
}

export default function TransferItemDrawer({
  isOpen,
  onClose,
  selectedItems,
  allItems,
  storageUnits
}: TransferItemDrawerProps) {
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferResults, setTransferResults] = useState<{ itemId: string; name: string; reason?: string }[] | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const quantities = useInventorySelection((state) => state.quantities);
  const setQuantity = useInventorySelection((state) => state.setQuantity);
  const setQuantities = useInventorySelection((state) => state.setQuantities);
  const clearQuantities = useInventorySelection((state) => state.clearQuantities);
  const clearSelection = useInventorySelection((state) => state.clear);
  const selectedDestination = useInventorySelection((state) => state.selectedDestination);
  const setSelectedDestination = useInventorySelection((state) => state.setSelectedDestination);
  const depositToStorage = useInventoryStore((state) => state.depositToStorage);
  const itemsByStorageId = useStorageStore((state) => state.itemsByStorageId);
  const touchedQuantitiesRef = useRef<Set<string>>(new Set());

  const groupedItems = useMemo(() => {
    const map = new Map<string, { key: string; item: InventoryItemDTO; count: number; unitValue: number }>();
    for (const item of selectedItems) {
      const key = item.marketHashName;
      const unitValue = item.price ?? item.storagePrice ?? 0;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { key, item, count: 1, unitValue });
      }
    }
    return Array.from(map.values());
  }, [selectedItems]);

  const availableItemsByKey = useMemo(() => {
    const map = new Map<string, InventoryItemDTO[]>();
    for (const item of allItems) {
      const key = item.marketHashName;
      const existing = map.get(key);
      if (existing) {
        existing.push(item);
      } else {
        map.set(key, [item]);
      }
    }
    return map;
  }, [allItems]);

  const itemNameById = useMemo(() => {
    return new Map(selectedItems.map((item) => [item.id, item.marketHashName]));
  }, [selectedItems]);

  useEffect(() => {
    const next: Record<string, number> = {};
    let changed = false;
    for (const group of groupedItems) {
      const existing = quantities[group.key];
      const availableCount = availableItemsByKey.get(group.key)?.length ?? group.count;
      const shouldReset = !touchedQuantitiesRef.current.has(group.key);
      const fallback = shouldReset ? group.count : (existing ?? group.count);
      const clamped = Math.min(Math.max(fallback, 1), availableCount);
      next[group.key] = clamped;
      if (existing !== clamped) {
        changed = true;
      }
    }
    if (!changed) {
      const keys = new Set(groupedItems.map((group) => group.key));
      if (Object.keys(quantities).some((key) => !keys.has(key)) || Object.keys(quantities).length !== keys.size) {
        changed = true;
      }
    }
    if (changed) {
      setQuantities(next);
    }
  }, [groupedItems, quantities, setQuantities]);

  useEffect(() => {
    if (!isOpen) {
      setTransferError(null);
      setTransferResults(null);
      setTransferSuccess(null);
      clearQuantities();
      touchedQuantitiesRef.current.clear();
    }
  }, [isOpen, clearQuantities]);

  useEffect(() => {
    if (selectedDestination && !storageUnits.some((unit) => unit.id === selectedDestination)) {
      setSelectedDestination(null);
    }
  }, [selectedDestination, storageUnits]);

  const totalSelectedCount = groupedItems.reduce((sum, group) => {
    const qty = quantities[group.key] ?? group.count;
    return sum + qty;
  }, 0);

  const totalValue = groupedItems.reduce((sum, group) => {
    const qty = quantities[group.key] ?? group.count;
    return sum + group.unitValue * qty;
  }, 0);

  const getItemImageUrl = (item: InventoryItemDTO) => {
    const image = item.schema?.image ?? item.iconUrl;
    if (!image) return null;
    if (image.startsWith("http")) return image;
    return `https://community.cloudflare.steamstatic.com/economy/image/${image}/360fx360f`;
  };

  const handleTransfer = async () => {
    if (!selectedDestination) return;

    setIsTransferring(true);
    setTransferError(null);
    setTransferResults(null);
    setTransferSuccess(null);
    try {
      const grouped = new Map<string, InventoryItemDTO[]>();
      for (const item of selectedItems) {
        const key = item.marketHashName;
        const group = grouped.get(key);
        if (group) {
          group.push(item);
        } else {
          grouped.set(key, [item]);
        }
      }

      const itemIds: string[] = [];
      for (const group of groupedItems) {
        const qty = quantities[group.key] ?? group.count;
        const selectedGroupItems = grouped.get(group.key) ?? [];
        const allGroupItems = availableItemsByKey.get(group.key) ?? selectedGroupItems;
        const selectedIds = new Set(selectedGroupItems.map((item) => item.id));
        const orderedItems = [
          ...selectedGroupItems,
          ...allGroupItems.filter((item) => !selectedIds.has(item.id))
        ];
        itemIds.push(...orderedItems.slice(0, qty).map((item) => item.id));
      }

      const response = await depositToStorage(selectedDestination, itemIds);
      const failed = response.results.filter((result) => result.status === "error");
      if (response.status === "ok") {
        setTransferSuccess("Items moved successfully. Updating inventory...");
        clearSelection();
        setTimeout(() => {
          onClose();
        }, 3000);
        return;
      }

      if (response.status === "partial") {
        const failedItems = failed.map((result) => ({
          itemId: result.itemId,
          name: itemNameById.get(result.itemId) ?? result.itemId,
          reason: result.reason
        }));
        setTransferResults(failedItems);
        clearSelection();
      } else {
        setTransferError("Failed to transfer items. Please try again.");
      }
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : "Failed to transfer items");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <aside
      aria-hidden={!isOpen}
      className={cn(
        "sticky top-0 right-0 z-40 flex h-screen flex-shrink-0 flex-col overflow-hidden border-l border-white/5 bg-[#151A25] transition-[width,opacity] duration-300 ease-in-out",
        isOpen
          ? "w-full opacity-100 sm:w-[420px] lg:w-[450px]"
          : "w-0 opacity-0 pointer-events-none"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transfer Items
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Summary Card */}
          <div className="p-6 pb-0">
            <div className="rounded-2xl border border-primary/20 bg-[#1B2535] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selection</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">{totalSelectedCount} Items</div>

                  <div className="mt-3 flex -space-x-2">
                    {selectedItems.slice(0, 5).map((item, idx) => (
                      <div
                        key={item.id}
                        className="relative h-9 w-9 overflow-hidden rounded-full border border-white/20 bg-slate-900"
                        style={{ zIndex: 5 - idx }}
                      >
                        {getItemImageUrl(item) && (
                          <Image
                            src={getItemImageUrl(item) as string}
                            alt={item.marketHashName}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                    ))}
                    {selectedItems.length > 5 && (
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-800 text-xs font-semibold text-slate-200"
                        style={{ zIndex: 0 }}
                      >
                        +{selectedItems.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Value</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-400">${totalValue.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {transferError ? (
            <div className="px-6 pt-4">
              <Alert
                color="danger"
                description={transferError}
                classNames={{
                  base: "w-full rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-3",
                  description: "text-xs leading-relaxed text-rose-200",
                  iconWrapper: "text-rose-200"
                }}
              />
            </div>
          ) : null}

          {transferResults && transferResults.length > 0 ? (
            <div className="px-6 pt-4">
              <Alert
                color="warning"
                description={
                  <div className="space-y-2 text-xs text-amber-200">
                    <div>Some items could not be moved:</div>
                    <ul className="space-y-1">
                      {transferResults.map((result) => (
                        <li key={result.itemId}>
                          {result.name} — {result.reason ?? "Unknown error"}
                        </li>
                      ))}
                    </ul>
                  </div>
                }
                classNames={{
                  base: "w-full rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-3",
                  description: "text-xs leading-relaxed text-amber-200",
                  iconWrapper: "text-amber-200"
                }}
              />
            </div>
          ) : null}

          {transferSuccess ? (
            <div className="px-6 pt-4">
              <Alert
                color="success"
                description={transferSuccess}
                classNames={{
                  base: "w-full rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-3",
                  description: "text-xs leading-relaxed text-emerald-200",
                  iconWrapper: "text-emerald-200"
                }}
              />
            </div>
          ) : null}

          {/* Source & Destination */}
          <div className="relative grid grid-cols-[24px_1fr] gap-x-4 gap-y-6 p-6">
            <div className="absolute bottom-6 left-[35px] top-6 w-[2px] bg-gradient-to-b from-white/10 via-white/25 to-white/10" />

            <div className="flex items-start justify-center">
              <div className="z-10 h-3 w-3 rounded-full bg-slate-500 ring-4 ring-slate-900" />
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">From Source</div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">Active Inventory</div>
                  <div className="text-xs text-muted-foreground">Currently selected account</div>
                </div>
              </div>
            </div>

            <div className="flex items-start justify-center">
              <div className="z-10 h-3 w-3 rounded-full bg-primary ring-4 ring-slate-900" />
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-primary">To Destination</div>

              <Select
                aria-label="Select destination"
                placeholder={storageUnits.length > 0 ? "Select destination..." : "No storage units available"}
                isDisabled={storageUnits.length === 0}
                selectedKeys={selectedDestination ? new Set([selectedDestination]) : new Set()}
                onSelectionChange={(keys) => {
                  const [first] = Array.from(keys);
                  setSelectedDestination((first as string) ?? null);
                }}
                selectionMode="single"
                disallowEmptySelection
                startContent={<FolderInput className="h-5 w-5 text-muted-foreground" />}
                classNames={{
                  trigger:
                    "h-14 rounded-xl border border-white/10 bg-[#1B2535] text-base shadow-none outline-none ring-0 data-[hover=true]:border-primary/40 data-[focus=true]:border-primary data-[focus=true]:ring-1 data-[focus=true]:ring-primary data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-1 data-[focus-visible=true]:ring-primary data-[open=true]:!border-primary data-[open=true]:!ring-1 data-[open=true]:!ring-primary data-[focus=true]:data-[hover=true]:!border-primary focus:outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-within:border-primary focus-within:ring-1 focus-within:ring-primary cursor-pointer",
                  base: "outline-none ring-0 focus:outline-none focus-visible:outline-none",
                  innerWrapper: "gap-3",
                  value: "text-base text-foreground",
                  popoverContent: "bg-[#151A25] border border-white/10"
                }}
                radius="lg"
                variant="bordered"
              >
                {storageUnits.map((unit) => {
                  const name = getStorageName(unit.marketHashName);
                  const cached = itemsByStorageId[unit.id];
                  const cachedCount = cached?.totalItems ?? cached?.items.length;
                  const inventoryCount = unit.storageItemsCount ?? null;
                  const count =
                    inventoryCount === null ||
                    (inventoryCount === 0 && (cachedCount ?? 0) > 0)
                      ? (cachedCount ?? 0)
                      : inventoryCount;
                  return (
                    <SelectItem key={unit.id} textValue={`${name} (${count} items)`}>
                      {name} ({count} items)
                    </SelectItem>
                  );
                })}
              </Select>

              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Items will be moved to the selected storage unit immediately.
              </div>
            </div>
          </div>

          {/* Item List Header */}
          <div className="sticky top-0 z-10 border-y border-white/10 bg-slate-950/80 px-6 py-3 backdrop-blur-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item Details</div>
          </div>

          {/* Item List */}
          <div className="divide-y divide-white/5">
            {groupedItems.map((group) => {
              const quantity = quantities[group.key] ?? group.count;
              const availableCount = availableItemsByKey.get(group.key)?.length ?? group.count;
              return (
                <div key={group.key} className="flex cursor-pointer items-start gap-4 p-4 transition-colors hover:bg-white/5">
                  <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-900/80">
                    {getItemImageUrl(group.item) && (
                      <Image
                        src={getItemImageUrl(group.item) as string}
                        alt={group.item.marketHashName}
                        fill
                        className="object-cover"
                      />
                    )}
                    {/* Removed rarity color bar as it's not present in DTO currently */}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 truncate text-sm font-medium">
                      <span className="truncate">{group.item.marketHashName}</span>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-muted-foreground">
                      <div className="flex items-center overflow-hidden rounded-lg border border-white/10 bg-slate-900/80">
                        <NumberInput
                          minValue={1}
                          maxValue={availableCount}
                          step={1}
                          value={quantity}
                          onValueChange={(rawValue) => {
                            const nextValue = Number.isFinite(rawValue) ? rawValue : availableCount;
                            const clamped = Math.min(Math.max(nextValue, 1), availableCount);
                            touchedQuantitiesRef.current.add(group.key);
                            setQuantity(group.key, clamped);
                          }}
                          className="w-14"
                          classNames={{
                            inputWrapper:
                              "h-8 min-h-0 rounded-none border-0 bg-transparent px-2 data-[hover=true]:border-0 group-data-[focus=true]:!border-0",
                            input: "text-xs text-foreground text-center"
                          }}
                          variant="bordered"
                        />
                        <div className="h-5 w-px bg-white/10" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            touchedQuantitiesRef.current.add(group.key);
                            setQuantity(group.key, availableCount);
                          }}
                          className="h-8 rounded-none px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Max
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold text-emerald-400">
                      ${(group.unitValue * quantity).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      ${group.unitValue.toFixed(2)} each
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-4 border-t border-white/10 p-6">
          <Alert
            color="warning"
            description="Please confirm your destination storage. This action cannot be undone instantly and may require cooldown."
            classNames={{
              base: "w-full rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-3",
              description: "text-xs leading-relaxed text-amber-200",
              iconWrapper: "text-amber-200"
            }}
          />

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="relative w-full cursor-pointer overflow-hidden bg-primary text-primary-foreground transition-all hover:bg-primary/90"
              disabled={!selectedDestination || isTransferring}
              onClick={handleTransfer}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Confirm Transfer
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="cursor-pointer text-muted-foreground hover:text-foreground"
            >
              Cancel Selection
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
