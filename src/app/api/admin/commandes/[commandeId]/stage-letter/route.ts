import { NextResponse } from "next/server";

import { generateStageLetterForFaculty } from "@/lib/utils/supabase/faculty-commandes";

const sanitizeText = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

export async function POST(request: Request, context: { params: Promise<{ commandeId: string }> }) {
  try {
    const { commandeId } = await context.params;
    const formData = await request.formData();

    const recipientName = sanitizeText(formData.get("recipient_name"));
    const recipientQuality = sanitizeText(formData.get("recipient_quality"));
    const recipientSex = sanitizeText(formData.get("recipient_sex"));
    const companyName = sanitizeText(formData.get("company_name"));
    const companyLocation = sanitizeText(formData.get("company_location"));

    if (
      !recipientName ||
      !recipientQuality ||
      !companyName ||
      !companyLocation ||
      (recipientSex !== "M" && recipientSex !== "F")
    ) {
      return new NextResponse("Informations de generation invalides.", { status: 400 });
    }

    const result = await generateStageLetterForFaculty({
      commandeId,
      recipientName,
      recipientQuality,
      recipientSex,
      companyName,
      companyLocation,
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la generation du document.";

    if (message === "access_denied") {
      return new NextResponse("Acces refuse.", { status: 403 });
    }

    if (message === "invalid_stage_commande") {
      return new NextResponse("Cette commande n'est pas de type stage.", { status: 400 });
    }

    if (message === "stage_commande_not_paid") {
      return new NextResponse("Le statut success est requis pour la generation.", { status: 400 });
    }

    return new NextResponse(message, { status: 500 });
  }
}
