import type { InventoryItemDTO } from "@casemove/shared-types";

export type TransferMode = "deposit" | "withdraw";

export type TransferResult = {
  itemId: string;
  name: string;
  reason?: string;
};

export type GroupedTransferItem = {
  key: string;
  item: InventoryItemDTO;
  count: number;
  unitValue: number;
};

export type TransferDrawerConfig = {
  mode: TransferMode;
  title: string;
  sourceLabel: string;
  sourceDescription: string;
  destinationLabel: string;
  actionLabel: string;
  successMessage: string;
};

export const TRANSFER_CONFIGS: Record<TransferMode, TransferDrawerConfig> = {
  deposit: {
    mode: "deposit",
    title: "Transfer Items",
    sourceLabel: "From Source",
    sourceDescription: "Active Inventory",
    destinationLabel: "To Destination",
    actionLabel: "Move to Storage",
    successMessage: "Items moved to storage successfully. Updating inventory..."
  },
  withdraw: {
    mode: "withdraw",
    title: "Withdraw Items",
    sourceLabel: "From Storage",
    sourceDescription: "Current Storage",
    destinationLabel: "To Destination",
    actionLabel: "Move to Inventory",
    successMessage: "Items moved to inventory successfully. Updating..."
  }
};
