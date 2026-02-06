import { createWithEqualityFn } from "zustand/traditional";

type SteamStatus = "idle" | "connecting" | "connected" | "error";

type SessionState = {
  steamStatus: SteamStatus;
  setSteamStatus: (newStatus: SteamStatus) => void;
};

export const useSessionStore = createWithEqualityFn<SessionState>()((set) => ({
  steamStatus: "idle",
  setSteamStatus: (newStatus) => set({ steamStatus: newStatus })
}));
