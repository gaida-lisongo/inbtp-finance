import { NextResponse } from "next/server";

import { saveTeacherCourseCotationRows } from "@/lib/utils/supabase/teacher-teaching";

type RouteParams = {
  matiereId?: string;
};

type SaveRowInput = {
  studentId?: unknown;
  cc?: unknown;
  examen?: unknown;
  rattrapage?: unknown;
  rachat?: unknown;
};

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const { matiereId } = await params;

  if (!matiereId) {
    return NextResponse.json({ error: "matiere_required" }, { status: 400 });
  }

  let rowsRaw: unknown = [];

  try {
    const body = (await request.json()) as { rows?: unknown };
    rowsRaw = body.rows ?? [];
  } catch {
    return NextResponse.json({ error: "invalid_cotation_rows" }, { status: 400 });
  }

  if (!Array.isArray(rowsRaw)) {
    return NextResponse.json({ error: "invalid_cotation_rows" }, { status: 400 });
  }

  const rows = rowsRaw
    .map((row) => row as SaveRowInput)
    .map((row) => ({
      studentId: typeof row.studentId === "string" ? row.studentId : "",
      cc: toNullableNumber(row.cc),
      examen: toNullableNumber(row.examen),
      rattrapage: toNullableNumber(row.rattrapage),
      rachat: toNullableNumber(row.rachat),
    }))
    .filter((row) => row.studentId.length > 0);

  try {
    const result = await saveTeacherCourseCotationRows(matiereId, rows);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "cotation_save_failed" },
      { status: 500 },
    );
  }
}
