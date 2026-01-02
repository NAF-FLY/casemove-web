type LoginPayload = {
  username: string;
  password: string;
  twoFactorCode?: string;
};

type LoginResponse = {
  token: string;
  steamStatus: string;
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
  const token = localStorage.getItem("casemove_token");
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
}
