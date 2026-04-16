import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getDocumentCategory } from "@/lib/utils/supabase/documents-shared";

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

    const { data: documentData, error: documentError } = await admin
      .from("documents")
      .select("id, designation, programme_id, caracteristique")
      .eq("id", productId)
      .maybeSingle();

    if (documentError) {
      throw new Error(documentError.message);
    }

    if (!documentData) {
      return NextResponse.json({ valid: false, error: "Document introuvable." }, { status: 404 });
    }

    const documentCategory = getDocumentCategory({
      caracteristique:
        documentData.caracteristique && typeof documentData.caracteristique === "object"
          ? (documentData.caracteristique as Record<string, unknown>)
          : null,
    });

    if (!documentCategory.trim().toLowerCase().includes("relev")) {
      return NextResponse.json({ valid: false, error: "Document non conforme a un relevé." }, { status: 400 });
    }

    const { data: commandesData, error: commandesError } = await admin
      .from("commande")
      .select('id, "orderNumber", created_at, categorie, total, product, student_id')
      .eq("student_id", studentId)
      .eq("product", productId)
      .eq("status", "success")
      .in("categorie", ["documents", "document", "releve", "releves"])
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
        categorie: string | null;
        total: number | null;
        product: string | null;
        student_id: string | null;
      }>)[0] ?? null;

    if (!commande) {
      return NextResponse.json({ valid: false, error: "Aucune commande valide trouvee." }, { status: 404 });
    }

    if (orderReference) {
      const normalizedOrderNumber = normalizeText(commande.orderNumber);
      const isReferenceMatching = orderReference === commande.id || (normalizedOrderNumber !== null && orderReference === normalizedOrderNumber);

      if (!isReferenceMatching) {
        return NextResponse.json({ valid: false, error: "Reference de document invalide." }, { status: 409 });
      }
    }

    const [{ data: studentData, error: studentError }, { data: programmeData, error: programmeError }] = await Promise.all([
      admin
        .from("students")
        .select("id, nom, post_nom, prenom, email, telephone, pays, ville, adresse, commune")
        .eq("id", studentId)
        .maybeSingle(),
      (documentData as { programme_id?: string | null }).programme_id
        ? admin.from("programmes").select("id, designation, annee_id").eq("id", (documentData as { programme_id: string }).programme_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (studentError) {
      throw new Error(studentError.message);
    }

    if (programmeError) {
      throw new Error(programmeError.message);
    }

    const programme = programmeData as { id: string; designation: string | null; annee_id: string | null } | null;
    const anneeId = programme?.annee_id ? normalizeText(programme.annee_id) : null;
    const { data: anneeData, error: anneeError } = anneeId
      ? await admin.from("annees").select("id, designation").eq("id", anneeId).maybeSingle()
      : { data: null, error: null };

    if (anneeError) {
      throw new Error(anneeError.message);
    }

    return NextResponse.json({
      valid: true,
      category: "releve",
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
              .trim() || "Etudiant",
            email: (studentData as { email: string | null }).email ?? null,
            telephone: (studentData as { telephone: string | null }).telephone ?? null,
            pays: (studentData as { pays: string | null }).pays ?? null,
            ville: (studentData as { ville: string | null }).ville ?? null,
            adresse: (studentData as { adresse: string | null }).adresse ?? null,
            commune: (studentData as { commune: string | null }).commune ?? null,
          }
        : null,
      product: {
        id: (documentData as { id: string }).id,
        designation: ((documentData as { designation?: string | null }).designation ?? "").trim() || null,
        category: documentCategory,
        programmeId: normalizeText((documentData as { programme_id?: string | null }).programme_id) ?? null,
      },
      programme: programme
        ? {
            id: programme.id,
            designation: programme.designation,
            annee: anneeData && typeof (anneeData as { designation?: string | null }).designation === "string" ? (anneeData as { designation: string }).designation : null,
          }
        : null,
      commande: {
        id: commande.id,
        orderNumber: commande.orderNumber,
        categorie: commande.categorie,
        total: commande.total,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne de verification.";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
