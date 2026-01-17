import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const cookieName = "casemove_token";

export async function GET() {
  const baseUrl = process.env.API_URL ?? "http://localhost:4000";
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (!token) {
    return NextResponse.json(
      { accounts: [], activeSteamAccountId: null },
      { status: 401 }
    );
  }

  const response = await fetch(`${baseUrl}/steam-accounts`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    return NextResponse.json(
      { accounts: [], activeSteamAccountId: null },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const baseUrl = process.env.API_URL ?? "http://localhost:4000";
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const response = await fetch(`${baseUrl}/steam-accounts`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
