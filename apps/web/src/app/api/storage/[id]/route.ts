import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const cookieName = "casemove_token";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const baseUrl = process.env.API_URL ?? "http://localhost:4000";
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  const authHeader =
    request.headers.get("authorization") ?? (token ? `Bearer ${token}` : null);
  // Forward forceRefresh query param
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("forceRefresh");
  const query = forceRefresh ? "?forceRefresh=true" : "";

  try {
    const response = await fetch(`${baseUrl}/storage/${id}${query}`, {
      cache: "no-store",
      headers: authHeader ? { Authorization: authHeader } : undefined,
      signal: AbortSignal.timeout(60000) // 60s timeout
    });

    if (!response.ok) {
        // If 429, try to get body
        if (response.status === 429) {
           const data = await response.json().catch(() => ({}));
           return NextResponse.json(data, { status: 429 });
        }
      return NextResponse.json({ items: [] }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Storage proxy error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ message, items: [] }, { status: 504 });
  }
}
