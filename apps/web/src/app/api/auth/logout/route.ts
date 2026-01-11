import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const cookieName = "casemove_token";

export async function POST(request: Request) {
  const baseUrl = process.env.API_URL ?? "http://localhost:4000";
  const isProduction = process.env.NODE_ENV === "production";
  const token = cookies().get(cookieName)?.value;
  const authHeader =
    request.headers.get("authorization") ?? (token ? `Bearer ${token}` : null);

  const response = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    headers: authHeader ? { Authorization: authHeader } : undefined
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Logout failed" },
      { status: response.status }
    );
  }

  const nextResponse = NextResponse.json({ ok: true });
  nextResponse.cookies.set({
    name: cookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 0
  });

  return nextResponse;
}
