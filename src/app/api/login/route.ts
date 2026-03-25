import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { getAuthOrigin, getSafeNextPath } from "@/lib/utils/supabase/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const copyCookies = (source: NextResponse, target: NextResponse) => {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
};

export async function GET(request: NextRequest) {
  try {
    const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));
    const authOrigin = await getAuthOrigin();
    const callbackUrl = new URL("/auth/callback", authOrigin);
    callbackUrl.searchParams.set("next", nextPath);

    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      supabaseUrl!,
      supabaseKey!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: callbackUrl.toString(),
        skipBrowserRedirect: true,
        scopes: "openid profile email",
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.url) {
      throw new Error("Supabase did not return an Azure login URL.");
    }

    const redirectResponse = NextResponse.redirect(data.url);
    copyCookies(response, redirectResponse);

    return redirectResponse;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        provider: "azure",
        message: error instanceof Error ? error.message : "Unable to start Azure SSO login.",
      },
      { status: 500 },
    );
  }
}
