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
      .select("id, caracteristique")
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
      .select('id, "orderNumber", created_at')
      .eq("student_id", studentId)
      .eq("product", productId)
      .eq("status", "success")
      .in("categorie", ["documents", "document", "releve", "releves"])
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
        return NextResponse.json({ valid: false, error: "Reference de document invalide." }, { status: 409 });
      }
    }

    return NextResponse.json({
      valid: true,
      category: "releve",
      productId,
      studentId,
      orderReference: commande.orderNumber ?? commande.id,
      validatedAt: commande.created_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne de verification.";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}

