import { NextResponse } from "next/server";

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
        stage: "configuration",
        message: config.message,
        env: config.env,
      },
      { status: 500 },
    );
  }

  const diagnostics = await fetchSupabaseDiagnostics(
    config.diagnosticsUrl,
    config.supabaseKey,
  );

  return NextResponse.json(
    {
      ok: diagnostics.ok,
      target: "overview",
      stage: "connectivity",
      message: diagnostics.message,
      env: config.env,
      availableTests: {
        client: "/api/supabase-test/client",
        server: "/api/supabase-test/server",
      },
      middleware: {
        utilityFilePresent: true,
        rootMiddlewarePresent: false,
      },
      ...diagnostics,
    },
    { status: diagnostics.ok ? 200 : 502 },
  );
}
