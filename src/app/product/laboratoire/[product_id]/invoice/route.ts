import { NextResponse } from "next/server";

import { DocumentLaboratoire } from "@/lib/documents";
import { getCommandeStudentDisplayName, getProductPageData } from "@/lib/utils/supabase/commandes";

const appBaseUrl = process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "");

export async function GET(_request: Request, context: { params: Promise<{ product_id: string }> }) {
  try {
    const { product_id: productId } = await context.params;
    const productData = await getProductPageData("laboratoire", productId);

    if (!productData.hasPaidAccess) {
      return new NextResponse("Le paiement est requis pour generer cette facture.", { status: 403 });
    }

    const verificationBaseUrl = appBaseUrl ?? "http://localhost:3000";
    const verificationUrl = `${verificationBaseUrl}/api/checking/laboratoire/${productId}`;
    const invoiceNumber = productData.existingSuccessCommande?.orderNumber ?? productData.existingSuccessCommande?.id ?? productId;

    const document = new DocumentLaboratoire({
      laboratoryTitle: productData.resource.title,
      student: {
        fullName: getCommandeStudentDisplayName(productData.student),
        email: productData.student.email,
        telephone: productData.student.telephone,
      },
      verificationUrl,
      invoiceNumber,
    });

    const pdfBuffer = await document.generateBuffer();
    const filename = `invoice-laboratoire-${productData.student.id}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la generation de l'invoice.";

    if (message === "auth_required") {
      return new NextResponse("Authentification requise.", { status: 401 });
    }

    if (message === "resource_access_denied") {
      return new NextResponse("Acces refuse a cette ressource.", { status: 403 });
    }

    return new NextResponse(message, { status: 500 });
  }
}
