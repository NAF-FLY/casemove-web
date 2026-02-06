import { Check, Loader2 } from "lucide-react";
import { Alert, Button } from "@heroui/react";

import type { TransferDrawerConfig } from "./types";

type TransferFooterProps = {
  config: TransferDrawerConfig;
  isReady: boolean;
  isTransferring: boolean;
  onTransfer: () => void;
  onClose: () => void;
};

export default function TransferFooter({
  config,
  isReady,
  isTransferring,
  onTransfer,
  onClose
}: TransferFooterProps) {
  const warningMessage = config.mode === "withdraw"
    ? "Items will be moved to your inventory. This action cannot be undone instantly."
    : "Please confirm your destination storage. This action cannot be undone instantly and may require cooldown.";

  return (
    <div className="flex flex-col items-stretch gap-4 border-t border-white/10 p-6">
      <Alert
        color="warning"
        description={warningMessage}
        classNames={{
          base: "w-full rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-3",
          description: "text-xs leading-relaxed text-amber-200",
          iconWrapper: "text-amber-200"
        }}
      />

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="relative w-full cursor-pointer overflow-hidden text-primary-foreground transition-all hover:bg-primary/90"
          isDisabled={!isReady || isTransferring}
          onPress={onTransfer}
          color="primary"
        >
          {isTransferring ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Transferring...
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              {config.actionLabel}
            </>
          )}
        </Button>

        <Button
          variant="light"
          size="sm"
          onPress={onClose}
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          Cancel Selection
        </Button>
      </div>
    </div>
  );
}
