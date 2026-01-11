import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const cookieName = "casemove_token";

export async function GET() {
  const baseUrl = process.env.API_URL ?? "http://localhost:4000";
  const token = cookies().get(cookieName)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false, personaName: null });
  }

  try {
    const response = await fetch(`${baseUrl}/auth/session`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return NextResponse.json({ authenticated: false, personaName: null });
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json({
      authenticated: true,
      personaName: data?.personaName ?? null
    });
  } catch {
    return NextResponse.json(
      { authenticated: false, personaName: null },
      { status: 500 }
    );
  }
}
