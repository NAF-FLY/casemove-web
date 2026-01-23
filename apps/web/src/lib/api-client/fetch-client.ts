import { supabase } from "@/lib/supabase";

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Get current session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // Prepare headers
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    try {
      // Attempt to refresh the session
      const { data, error } = await supabase.auth.refreshSession();

      if (!error && data.session) {
        // Session refreshed successfully, retry with new token
        headers.set("Authorization", `Bearer ${data.session.access_token}`);
        response = await fetch(input, { ...init, headers });
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  }

  return response;
}
