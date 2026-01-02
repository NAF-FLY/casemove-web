import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const baseUrl = process.env.API_URL ?? "http://localhost:4000";
  const authHeader = request.headers.get("authorization");
  const response = await fetch(`${baseUrl}/storage`, {
    cache: "no-store",
    headers: authHeader ? { Authorization: authHeader } : undefined
  });

  if (!response.ok) {
    return NextResponse.json({ units: [] }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
