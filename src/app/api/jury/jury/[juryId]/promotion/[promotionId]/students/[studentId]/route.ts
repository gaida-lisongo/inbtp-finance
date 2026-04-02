import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getJuryById, getNotesForProgramme } from "@/lib/utils/supabase/jury";
import { getProgrammeById } from "@/lib/utils/supabase/programmes";
import { NoteManager } from "@/utils/excel/NoteManager";

type RouteParams = {
  juryId?: string;
  promotionId?: string;
  studentId?: string;
};

const asNumberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function GET(
  _: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const resolvedParams = await params;
  const juryId = resolvedParams.juryId;
  const promotionId = resolvedParams.promotionId;
  const studentId = resolvedParams.studentId;

  if (!juryId || !promotionId || !studentId) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  const user = await getAuthenticatedUser();
  if (!user || !user.canManageCharges || !user.agentId || user.role !== "titulaire") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const jury = await getJuryById(juryId);
  if (!jury) {
    return NextResponse.json({ error: "Jury introuvable." }, { status: 404 });
  }

  const isMember = jury.president_id === user.agentId || jury.secretaire_id === user.agentId;
  if (!isMember) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  if (jury.isActivate !== true) {
    return NextResponse.json({ error: "Jury inactif." }, { status: 403 });
  }

  const programme = await getProgrammeById(promotionId);
  if (!programme) {
    return NextResponse.json({ error: "Promotion introuvable." }, { status: 404 });
  }

  if (jury.annee_id && programme.annee_id && jury.annee_id !== programme.annee_id) {
    return NextResponse.json({ error: "Promotion invalide pour ce jury." }, { status: 403 });
  }

  const admin = createAdminClient();

  const [{ data: parcoursRow, error: parcoursError }, { data: studentRow, error: studentError }] =
    await Promise.all([
      admin
        .from("parcours")
        .select("id, reference")
        .eq("programme_id", promotionId)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("students")
        .select("id, nom, post_nom, prenom, email")
        .eq("id", studentId)
        .maybeSingle(),
    ]);

  if (parcoursError) {
    return NextResponse.json({ error: parcoursError.message }, { status: 500 });
  }

  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }

  if (!parcoursRow || !studentRow) {
    return NextResponse.json({ error: "Étudiant non inscrit." }, { status: 404 });
  }

  const { data: semestresData, error: semestresError } = await admin
    .from("semestres")
    .select("id, created_at, designation")
    .eq("programme_id", promotionId)
    .order("created_at", { ascending: true });

  if (semestresError) {
    return NextResponse.json({ error: semestresError.message }, { status: 500 });
  }

  const semestres = (semestresData ?? []) as Array<{
    id: string;
    created_at: string;
    designation: string | null;
  }>;
  const semestreIds = semestres.map((semestre) => semestre.id);

  const { data: unitesData, error: unitesError } = semestreIds.length
    ? await admin
        .from("unites")
        .select("id, created_at, semestre_id, designation, code, credits")
        .in("semestre_id", semestreIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (unitesError) {
    return NextResponse.json({ error: unitesError.message }, { status: 500 });
  }

  const unites = (unitesData ?? []) as Array<{
    id: string;
    created_at: string;
    semestre_id: string | null;
    designation: string | null;
    code: string | null;
    credits: number | null;
  }>;
  const uniteIds = unites.map((unite) => unite.id);

  const { data: matieresData, error: matieresError } = uniteIds.length
    ? await admin
        .from("matieres")
        .select("id, created_at, unite_id, designation, credits")
        .in("unite_id", uniteIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (matieresError) {
    return NextResponse.json({ error: matieresError.message }, { status: 500 });
  }

  const matieres = (matieresData ?? []) as Array<{
    id: string;
    created_at: string;
    unite_id: string | null;
    designation: string | null;
    credits: number | null;
  }>;
  const semestresById = new Map(semestres.map((semestre) => [semestre.id, semestre] as const));
  const unitesById = new Map(unites.map((unite) => [unite.id, unite] as const));
  const matiereIds = matieres.map((matiere) => matiere.id);
  const { data: ficheData, error: ficheError } = matiereIds.length
    ? await admin
        .from("fiche_cotation")
        .select("id, matiere_id, cc, examen, rattrapage, rachat, is_validate")
        .eq("student_id", studentId)
        .in("matiere_id", matiereIds)
    : { data: [], error: null };

  if (ficheError) {
    return NextResponse.json({ error: ficheError.message }, { status: 500 });
  }

  const ficheRows = (ficheData ?? []) as Array<{
    id: string;
    matiere_id: string | null;
    cc: number | null;
    examen: number | null;
    rattrapage: number | null;
    rachat: number | null;
    is_validate: string | null;
  }>;
  const ficheByMatiereId = new Map(
    ficheRows
      .filter((row) => row.matiere_id)
      .map((row) => [row.matiere_id as string, row] as const),
  );

  const notes = await getNotesForProgramme(promotionId);
  const studentResult =
    NoteManager.calculerResultatsPromotion(notes).find(
      (item) => item.studentId === studentId,
    ) ?? null;

  const courses = matieres
    .map((matiere) => {
      const unite = matiere.unite_id ? unitesById.get(matiere.unite_id) ?? null : null;
      const semestre = unite?.semestre_id ? semestresById.get(unite.semestre_id) ?? null : null;
      const fiche = ficheByMatiereId.get(matiere.id) ?? null;

      return {
        matiere_id: matiere.id,
        matiere: {
          id: matiere.id,
          designation: matiere.designation,
          credits: matiere.credits,
        },
        unite: unite
          ? {
              id: unite.id,
              code: unite.code,
              designation: unite.designation,
              credits: unite.credits,
            }
          : null,
        semestre: semestre
          ? {
              id: semestre.id,
              designation: semestre.designation,
            }
          : null,
        cotation: {
          id: fiche?.id ?? null,
          cc: fiche?.cc ?? null,
          examen: fiche?.examen ?? null,
          rattrapage: fiche?.rattrapage ?? null,
          rachat: fiche?.rachat ?? null,
          is_validate: fiche?.is_validate ?? null,
        },
      };
    });

  return NextResponse.json({
    jury: { id: jury.id, designation: jury.designation },
    programme: { id: programme.id, designation: programme.designation },
    student: {
      id: studentRow.id,
      nom: studentRow.nom,
      post_nom: studentRow.post_nom,
      prenom: studentRow.prenom,
      email: studentRow.email,
      reference: parcoursRow.reference,
    },
    result: studentResult,
    courses,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const resolvedParams = await params;
  const juryId = resolvedParams.juryId;
  const promotionId = resolvedParams.promotionId;
  const studentId = resolvedParams.studentId;

  if (!juryId || !promotionId || !studentId) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  const user = await getAuthenticatedUser();
  if (!user || !user.agentId || user.role !== "titulaire") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const jury = await getJuryById(juryId);
  if (!jury) {
    return NextResponse.json({ error: "Jury introuvable." }, { status: 404 });
  }

  const isMember = jury.president_id === user.agentId || jury.secretaire_id === user.agentId;
  if (!isMember) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  if (jury.isActivate !== true) {
    return NextResponse.json({ error: "Jury inactif." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        password?: string;
        items?: Array<{
          matiere_id?: string;
          cc?: unknown;
          examen?: unknown;
          rattrapage?: unknown;
          rachat?: unknown;
          is_validate?: unknown;
        }>;
      }
    | null;

  const password = body?.password ?? "";
  if (!password) {
    return NextResponse.json({ error: "Mot de passe requis." }, { status: 400 });
  }

  console.log('Password received for jury:', password);
  console.log('Actual jury password:', jury);

  if ((jury.password ?? "") !== password) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 403 });
  }

  const programme = await getProgrammeById(promotionId);
  if (!programme) {
    return NextResponse.json({ error: "Promotion introuvable." }, { status: 404 });
  }

  if (jury.annee_id && programme.annee_id && jury.annee_id !== programme.annee_id) {
    return NextResponse.json({ error: "Promotion invalide pour ce jury." }, { status: 403 });
  }

  const items = Array.isArray(body?.items) ? body?.items ?? [] : [];
  const normalized = items
    .map((item) => ({
      matiere_id: typeof item.matiere_id === "string" ? item.matiere_id : null,
      cc: asNumberOrNull(item.cc),
      examen: asNumberOrNull(item.examen),
      rattrapage: asNumberOrNull(item.rattrapage),
      rachat: asNumberOrNull(item.rachat),
      is_validate: typeof item.is_validate === "string" ? item.is_validate : null,
    }))
    .filter((item) => Boolean(item.matiere_id));

  if (normalized.length === 0) {
    return NextResponse.json({ error: "Aucune cote à enregistrer." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: parcoursRow, error: parcoursError } = await admin
    .from("parcours")
    .select("id")
    .eq("programme_id", promotionId)
    .eq("student_id", studentId)
    .limit(1)
    .maybeSingle();

  if (parcoursError) {
    return NextResponse.json({ error: parcoursError.message }, { status: 500 });
  }

  if (!parcoursRow) {
    return NextResponse.json({ error: "Étudiant non inscrit." }, { status: 404 });
  }

  for (const item of normalized) {
    const matiereId = item.matiere_id as string;
    const { data: existingRow, error: existingError } = await admin
      .from("fiche_cotation")
      .select("id")
      .eq("student_id", studentId)
      .eq("matiere_id", matiereId)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const payload = {
      cc: item.cc,
      examen: item.examen,
      rattrapage: item.rattrapage,
      rachat: item.rachat,
      is_validate: item.is_validate,
    };

    if (existingRow?.id) {
      const { error: updateError } = await admin
        .from("fiche_cotation")
        .update(payload)
        .eq("id", existingRow.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await admin.from("fiche_cotation").insert({
        student_id: studentId,
        matiere_id: matiereId,
        ...payload,
      });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
