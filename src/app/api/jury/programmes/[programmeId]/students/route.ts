import { NextResponse } from "next/server";

import { getStudentsForProgramme } from "@/lib/utils/supabase/jury";

export async function GET(
  _: Request,
  { params }: { params: { programmeId?: string } },
) {
  const programmeId = params.programmeId;

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
