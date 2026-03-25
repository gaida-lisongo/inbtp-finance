import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  getAuthAuthorization,
  UNAUTHORIZED_GROUP_ERROR,
} from "@/lib/utils/supabase/authorization";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const PRESENTATION_MODE = true;

const isMissingSessionError = (message: string | null | undefined) => {
  if (!message) {
    return false;
  }

  const normalizedMessage = message.trim().toLowerCase();

  return (
    normalizedMessage === "auth session missing!" ||
    normalizedMessage.includes("refresh token not found") ||
    normalizedMessage.includes("invalid refresh token")
  );
};

const copySupabaseCookies = (source: NextResponse, target: NextResponse) => {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
};

const clearSupabaseCookies = (request: NextRequest, response: NextResponse) => {
  request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith("sb-"))
    .forEach((cookie) => {
      response.cookies.set(cookie.name, "", {
        expires: new Date(0),
        maxAge: 0,
        path: "/",
      });
    });
};

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
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

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  const hasInvalidSession = isMissingSessionError(userError?.message);

  const resolvedUser = hasInvalidSession ? null : user ?? null;
  const authorization = getAuthAuthorization({
    user: resolvedUser,
    claims: null,
  });

  const pathname = request.nextUrl.pathname;
  const isPublicRoute =
    pathname === "/signin" ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/api/supabase-test");

  if (!PRESENTATION_MODE && !resolvedUser && !isPublicRoute) {
    const signInUrl = new URL("/signin", request.url);
    const nextPath = `${pathname}${request.nextUrl.search}`;

    if (nextPath !== "/") {
      signInUrl.searchParams.set("next", nextPath);
    }

    const redirectResponse = NextResponse.redirect(signInUrl);
    copySupabaseCookies(supabaseResponse, redirectResponse);
    clearSupabaseCookies(request, redirectResponse);

    return redirectResponse;
  }

  if (!PRESENTATION_MODE && resolvedUser && !authorization.isAuthorized && !isPublicRoute) {
    const signInUrl = new URL("/signin", request.url);

    signInUrl.searchParams.set("error", UNAUTHORIZED_GROUP_ERROR);

    if (`${pathname}${request.nextUrl.search}` !== "/") {
      signInUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    }

    const redirectResponse = NextResponse.redirect(signInUrl);
    copySupabaseCookies(supabaseResponse, redirectResponse);

    return redirectResponse;
  }

  if (resolvedUser && (PRESENTATION_MODE || authorization.isAuthorized) && pathname === "/signin") {
    const nextPath = request.nextUrl.searchParams.get("next");
    const redirectUrl = new URL(
      nextPath && nextPath.startsWith("/") ? nextPath : "/",
      request.url,
    );
    const redirectResponse = NextResponse.redirect(redirectUrl);

    copySupabaseCookies(supabaseResponse, redirectResponse);

    return redirectResponse;
  }

  return supabaseResponse;
};
