import { NextRequest, NextResponse } from "next/server";

import { getNotesForProgramme } from "@/lib/utils/supabase/jury";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ programmeId: string }> },
) {
  const { programmeId } = await params;

  if (!programmeId) {
    return NextResponse.json(
      { error: "Programme ID requis" },
      { status: 400 },
    );
  }

  try {
    const notes = await getNotesForProgramme(programmeId);
    return NextResponse.json({ notes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}
