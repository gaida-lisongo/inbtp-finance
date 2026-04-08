import { NextRequest, NextResponse } from "next/server";

import { getStudentsForProgramme } from "@/lib/utils/supabase/jury";

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
    const students = await getStudentsForProgramme(programmeId);
    return NextResponse.json({ students });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}
