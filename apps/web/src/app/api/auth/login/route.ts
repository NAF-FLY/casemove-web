import { NextResponse } from "next/server";

const timeoutMs = 25000;

export async function POST(request: Request) {
  try {
    const baseUrl = process.env.API_URL ?? "http://localhost:4000";
    const payload = await request.json();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timeoutId);
      const cause = error instanceof Error ? (error.cause as { code?: string } | undefined) : undefined;
      const isTimeout =
        (error instanceof DOMException && error.name === "AbortError") ||
        cause?.code === "UND_ERR_HEADERS_TIMEOUT";
      return NextResponse.json(
        { message: isTimeout ? "Login timeout" : "Login failed" },
        { status: isTimeout ? 504 : 500 }
      );
    }

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        data?.message ? { message: data.message } : { message: "Login failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Login failed" }, { status: 500 });
  }
}
