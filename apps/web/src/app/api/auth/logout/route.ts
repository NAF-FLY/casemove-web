import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const baseUrl = process.env.API_URL ?? "http://localhost:4000";
  const token = request.headers.get("authorization");

  const response = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    headers: token ? { Authorization: token } : undefined
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Logout failed" },
      { status: response.status }
    );
  }

  return NextResponse.json({ ok: true });
}
