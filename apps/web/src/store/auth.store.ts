import { create } from "zustand";

import { login as loginRequest, logout as logoutRequest } from "@/lib/api-client/auth";

type SteamStatus = "idle" | "connected" | "pending" | "error";

type LoginPayload = {
  username: string;
  password: string;
  twoFactorCode?: string;
};

type AuthState = {
  token: string | null;
  isInitialized: boolean;
  personaName: string | null;
  steamStatus: SteamStatus;
  loading: boolean;
  error: string | null;
  setToken: (token: string) => void;
  setPersonaName: (name: string | null) => void;
  setSteamStatus: (status: SteamStatus) => void;
  setError: (message: string | null) => void;
  initFromStorage: () => void;
  logout: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isInitialized: false,
  personaName: null,
  steamStatus: "idle",
  loading: false,
  error: null,
  setToken: (token) => {
    set({ token });
    localStorage.setItem("casemove_token", token);
  },
  setPersonaName: (name) => {
    set({ personaName: name });
    if (name) {
      localStorage.setItem("casemove_persona", name);
    } else {
      localStorage.removeItem("casemove_persona");
    }
  },
  setSteamStatus: (status) => set({ steamStatus: status }),
  setError: (message) => set({ error: message }),
  initFromStorage: () => {
    set({ isInitialized: false });
    const token = localStorage.getItem("casemove_token");
    const personaName = localStorage.getItem("casemove_persona");
    if (token) {
      set({ token });
    }
    if (personaName) {
      set({ personaName });
    }
    set({ isInitialized: true });
  },
  logout: async () => {
    try {
      await logoutRequest();
    } finally {
      set({ token: null, steamStatus: "idle", error: null, personaName: null });
      localStorage.removeItem("casemove_token");
      localStorage.removeItem("casemove_persona");
    }
  },
  login: async (payload) => {
    set({ loading: true, error: null });

    try {
      const result = await loginRequest(payload);
      set({
        token: result.token,
        steamStatus: "connected",
        personaName: result.personaName ?? null,
        loading: false
      });
      localStorage.setItem("casemove_token", result.token);
      if (result.personaName) {
        localStorage.setItem("casemove_persona", result.personaName);
      } else {
        localStorage.removeItem("casemove_persona");
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Login failed",
        steamStatus: "error",
        loading: false
      });
    }
  }
}));
