import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/utils/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ ok: true, students: [] });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("students")
    .select("id, nom, post_nom, prenom, email, grade")
    .or(
      `nom.ilike.%${query}%,post_nom.ilike.%${query}%,prenom.ilike.%${query}%,email.ilike.%${query}%`,
    )
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    students:
      (data ?? []).map((row) => ({
        id: row.id,
        nom: row.nom,
        post_nom: row.post_nom,
        prenom: row.prenom,
        email: row.email,
        grade: row.grade,
      })) ?? [],
  });
}
