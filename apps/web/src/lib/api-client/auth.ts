type LoginPayload = {
  username: string;
  password: string;
  twoFactorCode?: string;
};

type LoginResponse = {
  steamStatus: string;
  personaName: string | null;
};

type SessionResponse = {
  authenticated: boolean;
  personaName: string | null;
};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let message = "Login failed";

    try {
      const data = await response.json();
      if (data?.message) {
        message = data.message;
      }
    } catch {
      // ignore parse errors
    }

    throw new Error(message);
  }

  return response.json();
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST"
  });
}

export async function fetchSession(): Promise<SessionResponse> {
  const response = await fetch("/api/auth/session", { cache: "no-store" });

  if (!response.ok) {
    return { authenticated: false, personaName: null };
  }

  const data = await response.json().catch(() => ({}));
  return {
    authenticated: Boolean(data?.authenticated),
    personaName: data?.personaName ?? null
  };
}
