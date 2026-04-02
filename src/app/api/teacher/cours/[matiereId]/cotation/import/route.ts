import { NextResponse } from "next/server";

import { importTeacherCourseCotationFromCsv } from "@/lib/utils/supabase/teacher-teaching";

type RouteParams = {
  matiereId?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const { matiereId } = await params;

  if (!matiereId) {
    return NextResponse.json({ error: "matiere_required" }, { status: 400 });
  }

  let csvContent = "";

  try {
    const body = (await request.json()) as { csvContent?: unknown };
    csvContent = typeof body.csvContent === "string" ? body.csvContent : "";
  } catch {
    return NextResponse.json({ error: "csv_empty" }, { status: 400 });
  }

  try {
    await importTeacherCourseCotationFromCsv(matiereId, csvContent);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "cotation_csv_import_failed" },
      { status: 500 },
    );
  }
}
