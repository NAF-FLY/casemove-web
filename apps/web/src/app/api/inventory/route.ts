import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const cookieName = "casemove_token";

export async function GET(request: Request) {
  const baseUrl = process.env.API_URL ?? "http://localhost:4000";
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  const authHeader =
    request.headers.get("authorization") ?? (token ? `Bearer ${token}` : null);
  
  // Forward forceRefresh query param
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("forceRefresh");
  const backendUrl = forceRefresh === "true" 
    ? `${baseUrl}/inventory?forceRefresh=true` 
    : `${baseUrl}/inventory`;
  
  try {
    const response = await fetch(backendUrl, {
      cache: "no-store",
      headers: authHeader ? { Authorization: authHeader } : undefined,
      signal: AbortSignal.timeout(60000) // 60s timeout
    });

    if (!response.ok) {
      return NextResponse.json({ items: [] }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Inventory proxy error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ message, items: [] }, { status: 504 }); // 504 for timeout/fetch failure
  }
}
