import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.next();
  }

  const callbackUrl = request.nextUrl.clone();
  callbackUrl.pathname = "/auth/callback";

  return NextResponse.redirect(callbackUrl);
}

export const config = {
  matcher: ["/"],
};
