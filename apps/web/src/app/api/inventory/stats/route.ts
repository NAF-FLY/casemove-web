import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const cookieName = "casemove_token";

export async function GET(request: Request) {
  const baseUrl = process.env.API_URL ?? "http://localhost:4000";
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  const authHeader =
    request.headers.get("authorization") ?? (token ? `Bearer ${token}` : null);
  
  const url = new URL(request.url);
  const steamAccountId = url.searchParams.get("steamAccountId");
  const storageId = url.searchParams.get("storageId");
  
  if (!steamAccountId) {
    return NextResponse.json({ message: "steamAccountId is required", stats: [] }, { status: 400 });
  }

  const backendUrl = new URL(`${baseUrl}/inventory/stats`);
  backendUrl.searchParams.append("steamAccountId", steamAccountId);
  if (storageId) {
    backendUrl.searchParams.append("storageId", storageId);
  }
  
  try {
    const response = await fetch(backendUrl.toString(), {
      cache: "no-store",
      headers: authHeader ? { Authorization: authHeader } : undefined,
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      return NextResponse.json({ stats: [] }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Inventory Stats proxy error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ message, stats: [] }, { status: 504 });
  }
}
