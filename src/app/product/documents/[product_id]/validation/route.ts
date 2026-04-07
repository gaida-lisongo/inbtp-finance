import { NextResponse } from "next/server";

import { DocumentValidate } from "@/lib/documents";
import { getProductPageData } from "@/lib/utils/supabase/commandes";

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
};

export async function GET(_request: Request, context: { params: Promise<{ product_id: string }> }) {
  try {
    const { product_id: productId } = await context.params;
    const productData = await getProductPageData("documents", productId);

    if (!productData.hasPaidAccess) {
      return new NextResponse("Le paiement est requis pour generer cette fiche.", { status: 403 });
    }

    const normalizedDocumentCategory = normalizeText(productData.resource.documentCategory);

    if (normalizedDocumentCategory !== "fiche de validation") {
      return new NextResponse("Ce document n'est pas une fiche de validation.", { status: 400 });
    }

    const document = new DocumentValidate({});
    const pdfBuffer = await document.generateBuffer();
    const filename = `fiche-validation-${productData.student.id}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la generation de la fiche de validation.";

    if (message === "auth_required") {
      return new NextResponse("Authentification requise.", { status: 401 });
    }

    if (message === "resource_access_denied") {
      return new NextResponse("Acces refuse a cette ressource.", { status: 403 });
    }

    return new NextResponse(message, { status: 500 });
  }
}
