import { cookies, headers } from "next/headers";

import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

const DEFAULT_POST_LOGIN_PATH = "/";
const configuredAppUrl =
  process.env.NEXT_PUBLIC_HOST_URL

const normalizeNextPath = (value: string | null | undefined) => {
  if (!value) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  return value.startsWith("/") ? value : DEFAULT_POST_LOGIN_PATH;
};

const getRequestOrigin = async () => {
  if (configuredAppUrl) {
    try {
      return new URL(configuredAppUrl).origin;
    } catch {
      // Fall back to the current request when the configured URL is invalid.
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

  return `${protocol}://${host}`;
};

export const createAzureSignInUrl = async (nextPath?: string | null) => {
  const origin = await getRequestOrigin();
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const safeNextPath = normalizeNextPath(nextPath);
  const callbackUrl = new URL("/auth/callback", origin);

  callbackUrl.searchParams.set("next", safeNextPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      scopes: "openid profile email offline_access User.Read Mail.Read Calendars.Read Files.Read",
      redirectTo: callbackUrl.toString(),
      skipBrowserRedirect: true,
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
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw new Error(error.message);
  }
};

export const getSafeNextPath = (value: string | null | undefined) => normalizeNextPath(value);
