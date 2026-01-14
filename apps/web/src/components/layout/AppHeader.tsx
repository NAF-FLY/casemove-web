"use client";

import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth.store";

const statusStyles = {
  connected: "text-primary",
  error: "text-destructive",
  idle: "text-muted-foreground",
  pending: "text-muted-foreground"
} as const;

export default function AppHeader() {
  const steamStatus = useAuthStore((state) => state.steamStatus);
  const userEmail = useAuthStore((state) => state.userEmail);
  const statusText =
    steamStatus === "connected"
      ? "Steam: Connected"
      : steamStatus === "error"
        ? "Steam: Error"
        : steamStatus === "pending"
          ? "Steam: Connecting..."
          : "Steam: Idle";

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-end border-b border-border/60 bg-gradient-to-r from-background via-card to-background px-8">
      <div className="flex items-center gap-2">
        <Badge
          className="rounded-full border border-border/60 bg-card px-4 py-1.5 text-xs font-medium"
          variant="outline"
        >
          <span className={statusStyles[steamStatus]}>{statusText}</span>
        </Badge>
        <Badge
          className="rounded-full border border-border/60 bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground"
          variant="outline"
        >
          {userEmail ?? "Account"}
        </Badge>
      </div>
    </header>
  );
}
