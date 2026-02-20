import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const cookieName = "casemove_token";

export async function POST(request: Request) {
  const baseUrl = process.env.API_URL ?? "http://localhost:4000";
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  const authHeader =
    request.headers.get("authorization") ?? (token ? `Bearer ${token}` : null);
  
  try {
    const body = await request.json();
    const { steamAccountId } = body;
    
    if (!steamAccountId) {
      return NextResponse.json({ message: "steamAccountId is required" }, { status: 400 });
    }

    const backendUrl = `${baseUrl}/inventory/stats/trigger`;
    
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body: JSON.stringify({ steamAccountId }),
      cache: "no-store",
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return NextResponse.json(errData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Inventory Stats Trigger proxy error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ message }, { status: 504 });
  }
}
