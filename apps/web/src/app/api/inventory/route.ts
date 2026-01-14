import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const cookieName = "casemove_token";

export async function GET(request: Request) {
  const baseUrl = process.env.API_URL ?? "http://localhost:4000";
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  const authHeader =
    request.headers.get("authorization") ?? (token ? `Bearer ${token}` : null);
  const response = await fetch(`${baseUrl}/inventory`, {
    cache: "no-store",
    headers: authHeader ? { Authorization: authHeader } : undefined
  });

  if (!response.ok) {
    return NextResponse.json({ items: [] }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
