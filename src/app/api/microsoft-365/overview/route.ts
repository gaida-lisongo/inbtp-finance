import { NextResponse } from "next/server";

import { getMicrosoft365Overview } from "@/lib/utils/microsoft-graph";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthenticated." }, { status: 401 });
  }

  try {
    const overview = await getMicrosoft365Overview();

    return NextResponse.json({
      ok: true,
      accountType: user.accountType,
      overview,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Microsoft 365 integration failed.",
      },
      { status: 500 },
    );
  }
}
