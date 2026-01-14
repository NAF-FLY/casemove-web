import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const cookieName = "casemove_token";
const loginPath = "/auth/login";
const inventoryPath = "/inventory";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(cookieName)?.value;

  if (pathname === loginPath) {
    if (token) {
      const inventoryUrl = request.nextUrl.clone();
      inventoryUrl.pathname = inventoryPath;
      inventoryUrl.search = "";
      return NextResponse.redirect(inventoryUrl);
    }

    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = loginPath;
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile", "/inventory/:path*", "/storage/:path*", "/auth/login"]
};
