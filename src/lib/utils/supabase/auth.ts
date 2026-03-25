import { cookies, headers } from "next/headers";
import { type User } from "@supabase/supabase-js";

import { getAuthAuthorization } from "@/lib/utils/supabase/authorization";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

const DEFAULT_POST_LOGIN_PATH = "/";
const configuredSsoUrl = process.env.NEXT_PUBLIC_SSO_URL?.trim();

const isMissingSessionError = (message: string) => message === "Auth session missing!";

const normalizeNextPath = (value: string | null | undefined) => {
  if (!value) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  return value.startsWith("/") ? value : DEFAULT_POST_LOGIN_PATH;
};

export const getAuthOrigin = async () => {
  if (configuredSsoUrl) {
    try {
      return new URL(configuredSsoUrl).origin;
    } catch {
      throw new Error("NEXT_PUBLIC_SSO_URL is not a valid absolute URL.");
    }
  }

  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");

  if (!host) {
    throw new Error("Unable to determine request host for Azure SSO.");
  }

  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProto ?? (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${configuredSsoUrl}`;
};

export const createAzureSignInUrl = async (nextPath?: string | null) => {
  const origin = await getAuthOrigin();
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const safeNextPath = normalizeNextPath(nextPath);
  const callbackUrl = new URL("/auth/callback", origin);

  callbackUrl.searchParams.set("next", safeNextPath);

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

  return {
    authorizationUrl: data.url,
    callbackUrl: callbackUrl.toString(),
    nextPath: safeNextPath,
  };
};

export const exchangeCodeForSession = async (code: string) => {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError) {
    throw new Error(claimsError.message);
  }

  const authorization = getAuthAuthorization({
    user: user ?? null,
    claims: (claims?.claims ?? null) as Record<string, unknown> | null,
  });

  console.info("[azure-sso] session established", {
    sessionAvailable: Boolean(data.session),
    email: user?.email ?? null,
    userId: user?.id ?? null,
    provider: user?.app_metadata?.provider ?? null,
    groups: authorization.groups,
    requiredGroup: authorization.requiredGroup,
    isAuthorized: authorization.isAuthorized,
    claims: claims?.claims ?? null,
  });

  return {
    session: data.session,
    user,
    claims: claims?.claims ?? null,
    groups: authorization.groups,
  };
};

export const getCurrentAuthProfile = async (): Promise<{
  user: User | null;
  claims: Record<string, unknown> | null;
  groups: string[];
}> => {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  console.info("[auth-profile] getSession()", {
    session: session
      ? {
          accessTokenPresent: Boolean(session.access_token),
          refreshTokenPresent: Boolean(session.refresh_token),
          expiresAt: session.expires_at ?? null,
        }
      : null,
    error: sessionError?.message ?? null,
  });

  if (sessionError && !isMissingSessionError(sessionError.message)) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    return {
      user: null,
      claims: null,
      groups: [],
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.info("[auth-profile] getUser()", {
    user: user
      ? {
          id: user.id,
          email: user.email ?? null,
          appMetadata: user.app_metadata,
          userMetadata: user.user_metadata,
        }
      : null,
    error: userError?.message ?? null,
  });

  if (userError && !isMissingSessionError(userError.message)) {
    throw new Error(userError.message);
  }

  if (!user) {
    return {
      user: null,
      claims: null,
      groups: [],
    };
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  console.info("[auth-profile] getClaims()", {
    claims: claimsData?.claims ?? null,
    error: claimsError?.message ?? null,
  });

  if (claimsError && !isMissingSessionError(claimsError.message)) {
    throw new Error(claimsError.message);
  }

  const claims = (claimsData?.claims ?? null) as Record<string, unknown> | null;
  const authorization = getAuthAuthorization({
    user,
    claims,
  });

  console.info("[auth-profile] authorization", {
    requiredGroup: authorization.requiredGroup,
    groups: authorization.groups,
    isAuthorized: authorization.isAuthorized,
  });

  return {
    user,
    claims,
    groups: authorization.groups,
  };
};

export const getSafeNextPath = (value: string | null | undefined) => normalizeNextPath(value);
