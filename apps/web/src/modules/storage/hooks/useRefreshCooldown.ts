import { useEffect, useMemo, useState } from "react";

type RefreshCooldownState = {
  isCooldown: boolean;
  remaining: number;
  formattedRemaining: string;
};

function formatTime(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function useRefreshCooldown(
  cooldownStartAt: number | undefined,
  cooldownMs = 2 * 60 * 1000
): RefreshCooldownState {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    if (!cooldownStartAt) {
      return { isCooldown: false, remaining: 0, formattedRemaining: "00:00" };
    }

    const diff = now - cooldownStartAt;
    const remaining = cooldownMs - diff;
    const safeRemaining = Math.min(cooldownMs, Math.max(0, remaining));

    return {
      isCooldown: remaining > 0,
      remaining: safeRemaining,
      formattedRemaining: formatTime(safeRemaining)
    };
  }, [cooldownStartAt, now, cooldownMs]);
}
