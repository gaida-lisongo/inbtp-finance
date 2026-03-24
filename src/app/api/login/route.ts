import { NextRequest, NextResponse } from "next/server";

import { createAzureSignInUrl } from "@/lib/utils/supabase/auth";

export async function GET(request: NextRequest) {
  try {
    const nextPath = request.nextUrl.searchParams.get("next");
    const { authorizationUrl } = await createAzureSignInUrl(nextPath);

    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        provider: "azure",
        message: error instanceof Error ? error.message : "Unable to start Azure SSO login.",
      },
      { status: 500 },
    );
  }
}
