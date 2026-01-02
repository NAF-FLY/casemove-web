"use client";

import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth.store";

const statusStyles = {
  connected: "text-[#5BEFE3]",
  error: "text-[var(--danger)]",
  idle: "text-[#9AA6D2]",
  pending: "text-[#9AA6D2]"
} as const;

export default function AppHeader() {
  const steamStatus = useAuthStore((state) => state.steamStatus);
  const personaName = useAuthStore((state) => state.personaName);
  const statusText =
    steamStatus === "connected"
      ? "Steam: Connected"
      : steamStatus === "error"
        ? "Steam: Error"
        : "Connecting...";

  return (
    <header className="flex items-center justify-between bg-[linear-gradient(90deg,#141a33_0%,#1b2142_50%,#141a33_100%)] px-8 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5F6BFF] text-xs font-semibold text-white">
          C
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#7E8BB6]">
            Casemove
          </div>
          <div className="text-sm font-semibold text-[#E7ECFF]">Web</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className="rounded-full border border-white/10 bg-[#141A33] px-4 py-1.5 text-xs font-medium text-[#5BEFE3]">
          <span className={statusStyles[steamStatus]}>{statusText}</span>
        </Badge>
        <Badge className="rounded-full border border-white/10 bg-[#141A33] px-4 py-1.5 text-xs font-medium text-[#9AA6D2]">
          {personaName ?? "Steam user"}
        </Badge>
      </div>
    </header>
  );
}
