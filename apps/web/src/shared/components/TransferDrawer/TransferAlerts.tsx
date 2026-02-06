import { Alert } from "@heroui/react";

import type { TransferResult } from "./types";

type TransferAlertsProps = {
  transferError: string | null;
  transferResults: TransferResult[] | null;
  transferSuccess: string | null;
};

export default function TransferAlerts({
  transferError,
  transferResults,
  transferSuccess
}: TransferAlertsProps) {
  return (
    <>
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
    </>
  );
}
