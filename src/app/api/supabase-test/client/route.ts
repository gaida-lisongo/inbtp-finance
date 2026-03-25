import { NextResponse } from "next/server";

import { createClient as createBrowserSupabaseClient } from "@/lib/utils/supabase/client";
import {
  fetchSupabaseDiagnostics,
  getSupabaseDiagnosticsConfig,
} from "@/lib/utils/supabase/diagnostics";

export async function GET() {
  const config = getSupabaseDiagnosticsConfig();

  if (!config.valid) {
    return NextResponse.json(
      {
        ok: false,
        target: "client",
        stage: "configuration",
        message: config.message,
        env: config.env,
      },
      { status: 500 },
    );
  }

  let helperCreated = false;
  let sessionError: string | null = null;
  let hasSession = false;

  try {
    const supabase = createBrowserSupabaseClient();
    helperCreated = true;

    const { data, error } = await supabase.auth.getSession();
    hasSession = Boolean(data.session);
    sessionError = error?.message ?? null;
  } catch (error) {
    sessionError = error instanceof Error ? error.message : "Unknown error";
  }

  const diagnostics = await fetchSupabaseDiagnostics(
    config.diagnosticsUrl,
    config.supabaseKey,
  );

  const ok = diagnostics.ok && helperCreated;

  return NextResponse.json(
    {
      target: "client",
      stage: ok ? "complete" : "connectivity",
      responseMessage: ok
        ? "Client helper was created and Supabase responded."
        : "Client helper check failed or Supabase did not respond cleanly.",
      env: config.env,
      helper: {
        created: helperCreated,
        session: {
          hasSession,
          error: sessionError,
        },
        note: "This route validates the client helper setup from a route-handler context. Browser-only persisted session behavior should still be verified from a real client page.",
      },
      ...diagnostics,
      ok,
      message:
        diagnostics.message ??
        (ok
          ? "Client helper was created and Supabase responded."
          : "Client helper check failed or Supabase did not respond cleanly."),
    },
    { status: ok ? 200 : 502 },
  );
}
