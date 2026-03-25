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
      target: "overview",
      stage: "connectivity",
      responseMessage: diagnostics.message,
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
      ok: diagnostics.ok,
      message: diagnostics.message,
    },
    { status: diagnostics.ok ? 200 : 502 },
  );
}
