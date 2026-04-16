import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/utils/supabase/admin";

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildStudentName = (student: { prenom: string | null; post_nom: string | null; nom: string | null }) =>
  [student.prenom, student.post_nom, student.nom].filter(Boolean).join(" ").trim() || "Etudiant";

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export type CheckStageLetterResponse =
  | {
      valid: true;
      category: "stage_letter";
      orderReference: string;
      validatedAt: string;
      commande: {
        id: string;
        orderNumber: string | null;
        createdAt: string;
        categorie: string | null;
        total: number | null;
      };
      stage: {
        id: string;
        slug: string | null;
      } | null;
      student: {
        id: string;
        fullName: string;
        email: string | null;
        telephone: string | null;
      } | null;
      programme: {
        id: string;
        designation: string | null;
      } | null;
    }
  | { valid: false; error: string };

export async function GET(request: Request, context: { params: Promise<{ order_reference: string }> }) {
  try {
    const { order_reference: orderReferenceRaw } = await context.params;
    const orderReference = normalizeText(orderReferenceRaw);
    const url = new URL(request.url);
    const studentId = normalizeText(url.searchParams.get("student_id"));

    if (!orderReference || !studentId) {
      return NextResponse.json({ valid: false, error: "Parametres invalides." } satisfies CheckStageLetterResponse, { status: 400 });
    }

    const admin = createAdminClient();
    const orClause = isUuid(orderReference) ? `id.eq.${orderReference},orderNumber.eq.${orderReference}` : `orderNumber.eq.${orderReference}`;

    const { data: commandesData, error: commandesError } = await admin
      .from("commande")
      .select('id, "orderNumber", created_at, product, categorie, student_id, total, status')
      .eq("student_id", studentId)
      .or(orClause)
      .eq("status", "success")
      .in("categorie", ["stage", "stages"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (commandesError) {
      throw new Error(commandesError.message);
    }

    const commande =
      ((commandesData ?? []) as Array<{
        id: string;
        orderNumber: string | null;
        created_at: string;
        product: string | null;
        categorie: string | null;
        student_id: string | null;
        total: number | null;
      }>)[0] ?? null;

    if (!commande) {
      return NextResponse.json({ valid: false, error: "Aucune commande valide trouvee." } satisfies CheckStageLetterResponse, { status: 404 });
    }

    const stageId = normalizeText(commande.product);

    const studentPromise = admin
      .from("students")
      .select("id, nom, post_nom, prenom, email, telephone")
      .eq("id", studentId)
      .maybeSingle();
    const parcoursPromise = admin.from("parcours").select("programme_id").eq("student_id", studentId).limit(1).maybeSingle();
    const stagePromise = stageId
      ? admin.from("stages").select("id, slug").eq("id", stageId).maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const [{ data: studentData, error: studentError }, { data: parcoursData, error: parcoursError }, { data: stageData, error: stageError }] =
      await Promise.all([studentPromise, parcoursPromise, stagePromise]);

    if (studentError) {
      throw new Error(studentError.message);
    }

    if (parcoursError) {
      throw new Error(parcoursError.message);
    }

    if (stageError) {
      throw new Error(stageError.message);
    }

    const programmeId = normalizeText((parcoursData as { programme_id?: string | null } | null)?.programme_id);
    const programme =
      programmeId !== null
        ? await (async () => {
            const { data, error } = await admin.from("programmes").select("id, designation").eq("id", programmeId).maybeSingle();
            if (error) throw new Error(error.message);
            return (data ?? null) as { id: string; designation: string | null } | null;
          })()
        : null;

    const studentRecord = (studentData ?? null) as {
      id: string;
      nom: string | null;
      post_nom: string | null;
      prenom: string | null;
      email: string | null;
      telephone: string | null;
    } | null;

    const stageRecord = (stageData ?? null) as { id: string; slug: string | null } | null;

    return NextResponse.json(
      {
        valid: true,
        category: "stage_letter",
        orderReference: commande.orderNumber ?? commande.id,
        validatedAt: commande.created_at,
        commande: {
          id: commande.id,
          orderNumber: commande.orderNumber,
          createdAt: commande.created_at,
          categorie: commande.categorie,
          total: commande.total,
        },
        stage: stageRecord,
        student: studentRecord
          ? {
              id: studentRecord.id,
              fullName: buildStudentName(studentRecord),
              email: studentRecord.email,
              telephone: studentRecord.telephone,
            }
          : null,
        programme,
      } satisfies CheckStageLetterResponse,
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne de verification.";
    return NextResponse.json({ valid: false, error: message } satisfies CheckStageLetterResponse, { status: 500 });
  }
}
