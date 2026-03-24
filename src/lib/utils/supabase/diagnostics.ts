const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

type SupabaseEnvStatus = {
  hasSupabaseUrl: boolean;
  hasPublishableKey: boolean;
};

type InvalidSupabaseDiagnosticsConfig = {
  valid: false;
  env: SupabaseEnvStatus;
  message: string;
};

type ValidSupabaseDiagnosticsConfig = {
  valid: true;
  env: SupabaseEnvStatus;
  supabaseKey: string;
  diagnosticsUrl: URL;
};

export type SupabaseDiagnosticsConfig =
  | InvalidSupabaseDiagnosticsConfig
  | ValidSupabaseDiagnosticsConfig;

export const getSupabaseOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const getSupabaseDiagnosticsConfig = (): SupabaseDiagnosticsConfig => {
  const env = {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasPublishableKey: Boolean(supabaseKey),
  };

  if (!env.hasSupabaseUrl || !env.hasPublishableKey) {
    return {
      valid: false,
      env,
      message: "Missing Supabase environment variables.",
    };
  }

  const supabaseOrigin = getSupabaseOrigin(supabaseUrl!);

  if (!supabaseOrigin) {
    return {
      valid: false,
      env,
      message: "NEXT_PUBLIC_SUPABASE_URL is not a valid URL.",
    };
  }

  return {
    valid: true,
    env,
    supabaseKey: supabaseKey!,
    diagnosticsUrl: new URL("/auth/v1/settings", supabaseOrigin),
  };
};

export const fetchSupabaseDiagnostics = async (
  diagnosticsUrl: URL,
  publishableKey: string,
) => {
  try {
    const response = await fetch(diagnosticsUrl, {
      method: "GET",
      headers: {
        apikey: publishableKey,
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    const details = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    return {
      ok: response.ok,
      message: response.ok
        ? "Supabase responded successfully."
        : "Supabase was reached but returned an error response.",
      request: {
        url: diagnosticsUrl.toString(),
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        details,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: "Failed to reach Supabase from the server.",
      request: {
        url: diagnosticsUrl.toString(),
      },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
