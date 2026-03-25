import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  getAuthAuthorization,
  UNAUTHORIZED_GROUP_ERROR,
} from "@/lib/utils/supabase/authorization";
import { getSafeNextPath } from "@/lib/utils/supabase/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const PRESENTATION_MODE = true;

const copyCookies = (source: NextResponse, target: NextResponse) => {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf-8");
};

const extractNextPathFromState = (state: string | null) => {
  if (!state) {
    return null;
  }

  const candidates = [state];

  try {
    candidates.push(decodeURIComponent(state));
  } catch {}

  try {
    candidates.push(base64UrlDecode(state));
  } catch {}

  for (const candidate of candidates) {
    try {
      const parsedJson = JSON.parse(candidate) as unknown;

      if (isRecord(parsedJson)) {
        const nextValue = parsedJson.nextPath ?? parsedJson.next;

        if (typeof nextValue === "string") {
          return nextValue;
        }
      }
    } catch {}

    try {
      const params = new URLSearchParams(candidate);
      const nextValue = params.get("nextPath") ?? params.get("next");

      if (nextValue) {
        return nextValue;
      }
    } catch {}
  }

  return null;
};

const buildErrorResponse = ({
  request,
  status,
  message,
  nextPath,
  details,
}: {
  request: NextRequest;
  status: number;
  message: string;
  nextPath: string;
  details?: Record<string, unknown>;
}) => {
  const payload = {
    ok: false,
    stage: "auth_callback",
    message,
    nextPath,
    details: details ?? null,
  };

  const acceptHeader = request.headers.get("accept") ?? "";

  if (request.nextUrl.searchParams.get("format") === "json" || acceptHeader.includes("application/json")) {
    return NextResponse.json(payload, { status });
  }

  const safeMessage = escapeHtml(message);
  const safeNextPath = escapeHtml(nextPath);

  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <title>Authentication callback failed</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="font-family: sans-serif; padding: 24px;">
    <h1>Authentication callback failed</h1>
    <p>${safeMessage}</p>
    <p>Status: ${status}</p>
    <p>Next path: ${safeNextPath}</p>
  </body>
</html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const oauthErrorDescription = request.nextUrl.searchParams.get("error_description");
  const nextPath = getSafeNextPath(
    request.nextUrl.searchParams.get("next") ?? extractNextPathFromState(state),
  );
  const redirectUrl = new URL(nextPath, request.nextUrl.origin);

  console.info("[azure-sso] callback received", {
    path: request.nextUrl.pathname,
    hasCode: Boolean(code),
    hasState: Boolean(state),
    nextPath,
    error: oauthError,
    errorDescription: oauthErrorDescription,
  });

  if (oauthError) {
    console.info("[azure-sso] callback provider error", {
      error: oauthError,
      errorDescription: oauthErrorDescription ?? null,
      state,
      nextPath,
    });

    return buildErrorResponse({
      request,
      status: 400,
      message: oauthErrorDescription ?? oauthError,
      nextPath,
      details: {
        error: oauthError,
        errorDescription: oauthErrorDescription ?? null,
        state,
      },
    });
  }

  if (!code) {
    console.info("[azure-sso] callback missing code", {
      state,
      nextPath,
    });

    return buildErrorResponse({
      request,
      status: 400,
      message: "Missing OAuth authorization code.",
      nextPath,
      details: {
        error: "missing_code",
        state,
      },
    });
  }

  try {
    const cookieStore = await cookies();
    const initialCookieNames = cookieStore.getAll().map((cookie) => cookie.name);
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
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
    });

    console.info("[azure-sso] callback before exchange", {
      nextPath,
      state,
      initialCookieNames,
    });

    const { data: exchangeData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.info("[azure-sso] exchangeCodeForSession failed", {
        message: exchangeError.message,
        status: exchangeError.status ?? null,
        code: exchangeError.code ?? null,
        nextPath,
      });

      return buildErrorResponse({
        request,
        status: exchangeError.status && exchangeError.status >= 400 ? exchangeError.status : 500,
        message: exchangeError.message,
        nextPath,
        details: {
          state,
          codePresent: true,
          exchangeError: {
            message: exchangeError.message,
            status: exchangeError.status ?? null,
            code: exchangeError.code ?? null,
          },
        },
      });
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const cookiesAfterExchange = response.cookies.getAll().map((cookie) => ({
      name: cookie.name,
      hasValue: Boolean(cookie.value),
    }));

    console.info("[azure-sso] callback exchange result", {
      session: session
        ? {
            accessTokenPresent: Boolean(session.access_token),
            refreshTokenPresent: Boolean(session.refresh_token),
            expiresAt: session.expires_at ?? null,
            tokenType: session.token_type ?? null,
          }
        : null,
      exchangeSessionAvailable: Boolean(exchangeData.session),
      user: user
        ? {
            id: user.id,
            email: user.email ?? null,
            appMetadata: user.app_metadata,
            userMetadata: user.user_metadata,
          }
        : null,
      claims: claimsData?.claims ?? null,
      errors: {
        session: sessionError?.message ?? null,
        user: userError?.message ?? null,
        claims: claimsError?.message ?? null,
      },
      cookiesAfterExchange,
      nextPath,
    });

    const authorization = getAuthAuthorization({
      user: user ?? null,
      claims: (claimsData?.claims ?? null) as Record<string, unknown> | null,
    });

    console.info("[azure-sso] callback authorization", {
      requiredGroup: authorization.requiredGroup,
      groups: authorization.groups,
      isAuthorized: authorization.isAuthorized,
    });

    if (sessionError || userError || claimsError || !session) {
      return buildErrorResponse({
        request,
        status: 500,
        message:
          sessionError?.message ??
          userError?.message ??
          claimsError?.message ??
          "Session exchange completed but no server session is available.",
        nextPath,
        details: {
          state,
          sessionError: sessionError?.message ?? null,
          userError: userError?.message ?? null,
          claimsError: claimsError?.message ?? null,
          hasSession: Boolean(session),
          cookiesAfterExchange,
        },
      });
    }

    if (!PRESENTATION_MODE && !authorization.isAuthorized) {
      await supabase.auth.signOut();

      const signInUrl = new URL("/signin", request.nextUrl.origin);
      signInUrl.searchParams.set("error", UNAUTHORIZED_GROUP_ERROR);

      if (nextPath !== "/") {
        signInUrl.searchParams.set("next", nextPath);
      }

      console.info("[azure-sso] callback access denied", {
        requiredGroup: authorization.requiredGroup,
        groups: authorization.groups,
        redirectTo: signInUrl.toString(),
      });

      const redirectResponse = NextResponse.redirect(signInUrl);
      copyCookies(response, redirectResponse);

      return redirectResponse;
    }

    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    redirectResponse.headers.set("cache-control", "no-store");

    console.info("[azure-sso] callback success", {
      redirectTo: redirectUrl.toString(),
      nextPath,
      cookieNames: cookiesAfterExchange.map((cookie) => cookie.name),
    });

    return redirectResponse;
  } catch (error) {
    const message = getErrorMessage(error);

    console.info("[azure-sso] callback unexpected failure", {
      message,
      state,
      nextPath,
    });

    return buildErrorResponse({
      request,
      status: 500,
      message,
      nextPath,
      details: {
        state,
      },
    });
  }
}
