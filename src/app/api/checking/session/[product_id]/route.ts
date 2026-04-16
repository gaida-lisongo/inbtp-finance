import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/utils/supabase/admin";

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function GET(request: Request, context: { params: Promise<{ product_id: string }> }) {
  try {
    const { product_id: productId } = await context.params;
    const url = new URL(request.url);
    const studentId = normalizeText(url.searchParams.get("student_id"));
    const orderReference = normalizeText(url.searchParams.get("order"));

    if (!normalizeText(productId) || !studentId) {
      return NextResponse.json({ valid: false, error: "Parametres invalides." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: sessionRow, error: sessionError } = await admin
      .from("session")
      .select("id, designation, date_debut, date_fin, montant, matieres, programme_id")
      .eq("id", productId)
      .maybeSingle();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (!sessionRow) {
      return NextResponse.json({ valid: false, error: "Session introuvable." }, { status: 404 });
    }

    const { data: commandesData, error: commandesError } = await admin
      .from("commande")
      .select('id, "orderNumber", created_at')
      .eq("student_id", studentId)
      .eq("product", productId)
      .eq("status", "success")
      .in("categorie", ["session", "sessions"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (commandesError) {
      throw new Error(commandesError.message);
    }

    const commande = ((commandesData ?? []) as Array<{ id: string; orderNumber: string | null; created_at: string }>)[0] ?? null;

    if (!commande) {
      return NextResponse.json({ valid: false, error: "Aucune commande valide trouvee." }, { status: 404 });
    }

    if (orderReference) {
      const normalizedOrderNumber = normalizeText(commande.orderNumber);
      const isReferenceMatching = orderReference === commande.id || (normalizedOrderNumber !== null && orderReference === normalizedOrderNumber);

      if (!isReferenceMatching) {
        return NextResponse.json({ valid: false, error: "Reference de macaron invalide." }, { status: 409 });
      }
    }

    const sessionProgrammeId =
      typeof (sessionRow as { programme_id?: string | null }).programme_id === "string" &&
      (sessionRow as { programme_id?: string | null }).programme_id?.trim()
        ? ((sessionRow as { programme_id: string }).programme_id.trim() as string)
        : null;

    const studentPromise = admin.from("students").select("id, nom, post_nom, prenom, email, telephone, ville, adresse").eq("id", studentId).maybeSingle();
    const parcoursPromise = sessionProgrammeId
      ? admin
          .from("parcours")
          .select("reference, programme_id, created_at")
          .eq("student_id", studentId)
          .eq("programme_id", sessionProgrammeId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });
    const programmePromise = sessionProgrammeId
      ? admin.from("programmes").select("id, designation, annee_id, systeme").eq("id", sessionProgrammeId).maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const [
      { data: studentData, error: studentError },
      { data: parcoursData, error: parcoursError },
      { data: programmeData, error: programmeError },
    ] = await Promise.all([studentPromise, parcoursPromise, programmePromise]);

    if (studentError) {
      throw new Error(studentError.message);
    }

    if (parcoursError) {
      throw new Error(parcoursError.message);
    }

    if (programmeError) {
      throw new Error(programmeError.message);
    }

    const programme = (programmeData ?? null) as {
      id: string;
      designation: string | null;
      annee_id: string | null;
      systeme: string | null;
    } | null;
    const parcours = (parcoursData ?? null) as {
      reference: string | null;
    } | null;

    const { data: anneeData, error: anneeError } =
      programme?.annee_id && programme.annee_id.trim().length > 0
        ? await admin.from("annees").select("designation").eq("id", programme.annee_id).maybeSingle()
        : { data: null, error: null };

    if (anneeError) {
      throw new Error(anneeError.message);
    }

    return NextResponse.json({
      valid: true,
      category: "session",
      productId,
      studentId,
      orderReference: commande.orderNumber ?? commande.id,
      validatedAt: commande.created_at,
      student: studentData
        ? {
            id: (studentData as { id: string }).id,
            fullName: [((studentData as { prenom: string | null }).prenom ?? "").trim(), ((studentData as { post_nom: string | null }).post_nom ?? "").trim(), ((studentData as { nom: string | null }).nom ?? "").trim()]
              .filter(Boolean)
              .join(" ")
              .trim(),
            email: (studentData as { email: string | null }).email ?? null,
            telephone: (studentData as { telephone: string | null }).telephone ?? null,
            ville: (studentData as { ville: string | null }).ville ?? null,
            adresse: (studentData as { adresse: string | null }).adresse ?? null,
            matricule: typeof parcours?.reference === "string" ? parcours.reference : null,
          }
        : null,
      session: sessionRow
        ? {
            id: (sessionRow as { id: string }).id,
            designation: ((sessionRow as { designation?: string | null }).designation ?? "").trim() || null,
            dateDebut: (sessionRow as { date_debut?: string | null }).date_debut ?? null,
            dateFin: (sessionRow as { date_fin?: string | null }).date_fin ?? null,
            montant: (sessionRow as { montant?: number | null }).montant ?? null,
            matieres: Array.isArray((sessionRow as { matieres?: unknown }).matieres) ? ((sessionRow as { matieres: unknown[] }).matieres as unknown[]) : [],
            programme:
              programme
                ? {
                    id: programme.id,
                    designation: programme.designation,
                    systeme: programme.systeme,
                    annee:
                      anneeData && typeof (anneeData as { designation?: string | null }).designation === "string"
                        ? (anneeData as { designation: string }).designation
                        : null,
                  }
                : null,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne de verification.";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
