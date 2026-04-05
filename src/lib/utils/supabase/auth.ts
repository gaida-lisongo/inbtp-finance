import { cookies, headers } from "next/headers";

import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

const DEFAULT_POST_LOGIN_PATH = "/";
const configuredAppUrl = process.env.NEXT_PUBLIC_HOST_URL;
const configuredDelegatedScopes = process.env.ENTRA_DELEGATED_SCOPES;
const defaultDelegatedScopes = "openid profile email offline_access User.Read";
const loginModeCookieName = "campus-login-mode";

export type LoginMode = "faculty_sso" | "student_password" | "teacher_password" | "admin_password";

const validLoginModes = new Set<LoginMode>(["faculty_sso", "student_password", "teacher_password", "admin_password"]);

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
});

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

export const normalizeLoginMode = (value: string | null | undefined): LoginMode | null => {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  return validLoginModes.has(normalizedValue as LoginMode) ? (normalizedValue as LoginMode) : null;
};

export const getCurrentLoginMode = async () => {
  const cookieStore = await cookies();
  return normalizeLoginMode(cookieStore.get(loginModeCookieName)?.value);
};

export const setLoginModeCookie = async (mode: LoginMode) => {
  const cookieStore = await cookies();
  cookieStore.set(loginModeCookieName, mode, buildCookieOptions());
};

export const clearLoginModeCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.set(loginModeCookieName, "", {
    ...buildCookieOptions(),
    maxAge: 0,
  });
};

export const getAuthCallbackUrl = async (nextPath?: string | null, loginMode?: LoginMode | null) => {
  const origin = await getRequestOrigin();
  const safeNextPath = normalizeNextPath(nextPath);
  const callbackUrl = new URL("/auth/callback", origin);

  callbackUrl.searchParams.set("next", safeNextPath);
  if (loginMode) {
    callbackUrl.searchParams.set("login_mode", loginMode);
  }

  return {
    callbackUrl: callbackUrl.toString(),
    nextPath: safeNextPath,
  };
};

export const createAzureSignInUrl = async (nextPath?: string | null) => {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const loginMode: LoginMode = "faculty_sso";
  cookieStore.set(loginModeCookieName, loginMode, buildCookieOptions());
  const { callbackUrl, nextPath: safeNextPath } = await getAuthCallbackUrl(nextPath, loginMode);
  const delegatedScopes = configuredDelegatedScopes?.trim() || defaultDelegatedScopes;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      scopes: delegatedScopes,
      redirectTo: callbackUrl,
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
    callbackUrl,
    nextPath: safeNextPath,
    loginMode,
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
