import { NextRequest, NextResponse } from "next/server";

import { exchangeCodeForSession, getSafeNextPath } from "@/lib/utils/supabase/auth";
import { syncAuthenticatedUser } from "@/lib/utils/supabase/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));
  const redirectUrl = new URL(nextPath, request.nextUrl.origin);

  if (!code) {
    redirectUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    await exchangeCodeForSession(code);
    await syncAuthenticatedUser();
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const signInUrl = new URL("/signin", request.nextUrl.origin);

    signInUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "oauth_callback_failed",
    );

    return NextResponse.redirect(signInUrl);
  }
}
