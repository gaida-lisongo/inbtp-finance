import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";
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
        target: "server",
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
    const supabase = createServerSupabaseClient(await cookies());
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
      ok,
      target: "server",
      stage: ok ? "complete" : "connectivity",
      message: ok
        ? "Server helper was created and Supabase responded."
        : "Server helper check failed or Supabase did not respond cleanly.",
      env: config.env,
      helper: {
        created: helperCreated,
        session: {
          hasSession,
          error: sessionError,
        },
      },
      ...diagnostics,
    },
    { status: ok ? 200 : 502 },
  );
}
