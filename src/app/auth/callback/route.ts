import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { exchangeCodeForSession, getSafeNextPath } from "@/lib/utils/supabase/auth";
import { syncAuthenticatedUser } from "@/lib/utils/supabase/session";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

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

    if (nextPath.startsWith("/signin") && nextPath.includes("student_email_confirmed")) {
      const cookieStore = await cookies();
      const supabase = createServerSupabaseClient(cookieStore);
      await supabase.auth.signOut();
    }

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
