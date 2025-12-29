import { create } from "zustand";

type SteamStatus = "idle" | "connecting" | "connected" | "error";

type SessionState = {
  steamStatus: SteamStatus;
  setSteamStatus: (newStatus: SteamStatus) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  steamStatus: "idle",
  setSteamStatus: (newStatus) => set({ steamStatus: newStatus })
}));
