import { create } from "zustand";

import {
  fetchSession,
  login as loginRequest,
  logout as logoutRequest
} from "@/lib/api-client/auth";

type SteamStatus = "idle" | "connected" | "pending" | "error";

type LoginPayload = {
  username: string;
  password: string;
  twoFactorCode?: string;
};

type AuthState = {
  isAuthenticated: boolean;
  isInitialized: boolean;
  personaName: string | null;
  steamStatus: SteamStatus;
  loading: boolean;
  error: string | null;
  setPersonaName: (name: string | null) => void;
  setSteamStatus: (status: SteamStatus) => void;
  setError: (message: string | null) => void;
  initFromSession: () => Promise<void>;
  logout: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isInitialized: false,
  personaName: null,
  steamStatus: "idle",
  loading: false,
  error: null,
  setPersonaName: (name) => {
    set({ personaName: name });
  },
  setSteamStatus: (status) => set({ steamStatus: status }),
  setError: (message) => set({ error: message }),
  initFromSession: async () => {
    set({ isInitialized: false });
    try {
      const session = await fetchSession();

      if (session.authenticated) {
        set({
          isAuthenticated: true,
          personaName: session.personaName,
          steamStatus: "connected",
          error: null
        });
      } else {
        set({
          isAuthenticated: false,
          personaName: null,
          steamStatus: "idle",
          error: null
        });
      }
    } catch (error) {
      set({
        isAuthenticated: false,
        personaName: null,
        steamStatus: "error",
        error: error instanceof Error ? error.message : "Failed to load session"
      });
    } finally {
      set({ isInitialized: true });
    }
  },
  logout: async () => {
    try {
      await logoutRequest();
    } finally {
      set({
        isAuthenticated: false,
        steamStatus: "idle",
        error: null,
        personaName: null
      });
    }
  },
  login: async (payload) => {
    set({ loading: true, error: null, steamStatus: "pending" });

    try {
      const result = await loginRequest(payload);
      const status = result.steamStatus === "connected" ? "connected" : "idle";
      set({
        isAuthenticated: true,
        steamStatus: status,
        personaName: result.personaName ?? null,
        loading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Login failed",
        steamStatus: "error",
        loading: false,
        isAuthenticated: false
      });
    }
  }
}));
