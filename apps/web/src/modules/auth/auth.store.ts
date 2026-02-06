import { createWithEqualityFn } from "zustand/traditional";

import { supabase } from "@/core/supabase/supabase";

type SteamStatus = "idle" | "connected" | "pending" | "error";

type AuthPayload = {
  email: string;
  password: string;
};

type AuthState = {
  isAuthenticated: boolean;
  isInitialized: boolean;
  userEmail: string | null;
  steamStatus: SteamStatus;
  loading: boolean;
  error: string | null;
  setUserEmail: (email: string | null) => void;
  setSteamStatus: (status: SteamStatus) => void;
  setError: (message: string | null) => void;
  initFromSession: () => Promise<void>;
  logout: () => Promise<void>;
  login: (payload: AuthPayload) => Promise<void>;
  register: (payload: AuthPayload) => Promise<void>;
};

const cookieName = "casemove_token";
const cookieMaxAgeSeconds = 60 * 60 * 24 * 7;

function setAuthCookie(token: string) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${cookieName}=${token}`,
    "path=/",
    "samesite=lax",
    `max-age=${cookieMaxAgeSeconds}`
  ];

  if (secure) {
    parts.push("secure");
  }

  document.cookie = parts.join("; ");
}

function clearAuthCookie() {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${cookieName}=`,
    "path=/",
    "samesite=lax",
    "max-age=0"
  ];

  if (secure) {
    parts.push("secure");
  }

  document.cookie = parts.join("; ");
}

export const useAuthStore = createWithEqualityFn<AuthState>()((set) => ({
  isAuthenticated: false,
  isInitialized: false,
  userEmail: null,
  steamStatus: "idle",
  loading: false,
  error: null,
  setUserEmail: (email) => {
    set({ userEmail: email });
  },
  setSteamStatus: (status) => set({ steamStatus: status }),
  setError: (message) => set({ error: message }),
  initFromSession: async () => {
    set({ isInitialized: false });
    try {
      // Set up auth state change listener
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session) {
            setAuthCookie(session.access_token);
            set({
              isAuthenticated: true,
              userEmail: session.user.email ?? null,
              steamStatus: "idle",
              error: null
            });
          }
        } else if (event === "SIGNED_OUT") {
          clearAuthCookie();
          set({
            isAuthenticated: false,
            userEmail: null,
            steamStatus: "idle",
            error: null
          });
        } else if (event === "USER_UPDATED" && session) {
          set({ userEmail: session.user.email ?? null });
        }
      });

      const { data, error } = await supabase.auth.getSession();

      if (!error && data.session) {
        setAuthCookie(data.session.access_token);
        set({
          isAuthenticated: true,
          userEmail: data.session.user?.email ?? null,
          steamStatus: "idle",
          error: null
        });
      } else {
        set({
          isAuthenticated: false,
          userEmail: null,
          steamStatus: "idle",
          error: null
        });
      }
    } catch (error) {
      set({
        isAuthenticated: false,
        userEmail: null,
        steamStatus: "error",
        error: error instanceof Error ? error.message : "Failed to load session"
      });
    } finally {
      set({ isInitialized: true });
    }
  },
  logout: async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      clearAuthCookie();
      set({
        isAuthenticated: false,
        steamStatus: "idle",
        error: null,
        userEmail: null
      });
    }
  },
  login: async (payload) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password
      });

      if (error || !data.session) {
        throw new Error(error?.message ?? "Login failed");
      }

      setAuthCookie(data.session.access_token);
      set({
        isAuthenticated: true,
        steamStatus: "idle",
        userEmail: data.session.user?.email ?? null,
        loading: false,
        error: null
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Login failed",
        loading: false,
        isAuthenticated: false
      });
    }
  },
  register: async (payload) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session) {
        setAuthCookie(data.session.access_token);
      }

      set({
        isAuthenticated: Boolean(data.session),
        userEmail: data.user?.email ?? null,
        steamStatus: "idle",
        loading: false,
        error: null
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Registration failed",
        loading: false,
        isAuthenticated: false
      });
    }
  }
}));
