import { NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const response = await updateSession(request);

  if (pathname !== "/") {
    return response;
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return response;
  }

  const callbackUrl = request.nextUrl.clone();
  callbackUrl.pathname = "/auth/callback";

  return NextResponse.redirect(callbackUrl);
}

export const config = {
  matcher: ["/"],
};
