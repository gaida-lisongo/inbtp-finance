import { NextResponse } from "next/server";

import { exportTeacherCourseCotationTemplateCsv } from "@/lib/utils/supabase/teacher-teaching";

type RouteParams = {
  matiereId?: string;
};

export async function GET(
  _: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const { matiereId } = await params;

  if (!matiereId) {
    return NextResponse.json({ error: "matiere_required" }, { status: 400 });
  }

  try {
    const csv = await exportTeacherCourseCotationTemplateCsv(matiereId);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="cotation-template-${matiereId}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "cotation_template_failed" },
      { status: 500 },
    );
  }
}
