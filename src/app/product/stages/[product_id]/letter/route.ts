import { NextResponse } from "next/server";

import { DocumentStage } from "@/lib/documents";
import { getCommandeStudentDisplayName, getProductPageData } from "@/lib/utils/supabase/commandes";

const sanitizeText = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

export async function POST(request: Request, context: { params: Promise<{ product_id: string }> }) {
  try {
    const { product_id: productId } = await context.params;
    const formData = await request.formData();

    const recipientName = sanitizeText(formData.get("recipient_name"));
    const recipientQuality = sanitizeText(formData.get("recipient_quality"));
    const recipientSex = sanitizeText(formData.get("recipient_sex"));
    const companyName = sanitizeText(formData.get("company_name"));
    const companyLocation = sanitizeText(formData.get("company_location"));

    if (!recipientName || !recipientQuality || !companyName || !companyLocation || (recipientSex !== "M" && recipientSex !== "F")) {
      return new NextResponse("Informations de generation invalides.", { status: 400 });
    }

    const productData = await getProductPageData("stages", productId);

    if (!productData.hasPaidAccess) {
      return new NextResponse("Le paiement est requis pour generer cette lettre.", { status: 403 });
    }

    const document = new DocumentStage({
      stageTitle: productData.resource.title,
      student: {
        fullName: getCommandeStudentDisplayName(productData.student),
        email: productData.student.email,
        telephone: productData.student.telephone,
      },
      recipientName,
      recipientQuality,
      recipientSex,
      companyName,
      companyLocation,
      documentReference: productData.existingSuccessCommande?.orderNumber ?? productData.existingSuccessCommande?.id ?? null,
    });

    const pdfBuffer = await document.generateBuffer();
    const filename = `lettre-stage-${productData.student.id}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la generation du document.";

    if (message === "auth_required") {
      return new NextResponse("Authentification requise.", { status: 401 });
    }

    if (message === "resource_access_denied") {
      return new NextResponse("Acces refuse a cette ressource.", { status: 403 });
    }

    return new NextResponse(message, { status: 500 });
  }
}
