import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/utils/supabase/admin";
import { formatResearchDescription } from "@/lib/utils/supabase/recherche-shared";

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

    const { data: laboratoireData, error: laboratoireError } = await admin
      .from("laboratoires")
      .select("id, slug, description, montant, programme_id, created_at")
      .eq("id", productId)
      .maybeSingle();

    if (laboratoireError) {
      throw new Error(laboratoireError.message);
    }

    if (!laboratoireData) {
      return NextResponse.json({ valid: false, error: "Laboratoire introuvable." }, { status: 404 });
    }

    const { data: commandesData, error: commandesError } = await admin
      .from("commande")
      .select('id, "orderNumber", created_at')
      .eq("student_id", studentId)
      .eq("product", productId)
      .eq("status", "success")
      .in("categorie", ["laboratoire", "laboratoires"])
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
        return NextResponse.json({ valid: false, error: "Reference du document invalide." }, { status: 409 });
      }
    }

    const programmeId = normalizeText((laboratoireData as { programme_id?: string | null }).programme_id ?? null);

    const [{ data: studentData, error: studentError }, { data: programmeData, error: programmeError }, { data: parcoursData, error: parcoursError }] = await Promise.all([
      admin.from("students").select("id, nom, post_nom, prenom, email, telephone, ville, adresse").eq("id", studentId).maybeSingle(),
      programmeId ? admin.from("programmes").select("id, designation, annee_id, systeme").eq("id", programmeId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      programmeId
        ? admin
            .from("parcours")
            .select("reference, created_at")
            .eq("student_id", studentId)
            .eq("programme_id", programmeId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (studentError) {
      throw new Error(studentError.message);
    }

    if (programmeError) {
      throw new Error(programmeError.message);
    }

    if (parcoursError) {
      throw new Error(parcoursError.message);
    }

    const anneeId = normalizeText((programmeData as { annee_id?: string | null } | null)?.annee_id ?? null);
    const { data: anneeData, error: anneeError } = anneeId
      ? await admin.from("annees").select("designation").eq("id", anneeId).maybeSingle()
      : { data: null, error: null };

    if (anneeError) {
      throw new Error(anneeError.message);
    }

    return NextResponse.json({
      valid: true,
      category: "laboratoire",
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
            matricule: (parcoursData as { reference?: string | null } | null)?.reference ?? null,
          }
        : null,
      laboratoire: {
        id: (laboratoireData as { id: string }).id,
        designation: normalizeText((laboratoireData as { slug?: string | null }).slug ?? null),
        description: formatResearchDescription((laboratoireData as { description?: unknown }).description ?? null) || null,
        montant: (laboratoireData as { montant?: number | null }).montant ?? null,
        programme:
          programmeData
            ? {
                designation: (programmeData as { designation?: string | null }).designation ?? null,
                systeme: (programmeData as { systeme?: string | null }).systeme ?? null,
                annee: (anneeData as { designation?: string | null } | null)?.designation ?? null,
              }
            : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne de verification.";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
