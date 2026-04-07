import { NextResponse } from "next/server";

import { createStageLetterRequestNotification } from "@/lib/utils/supabase/stage-notifications";

const sanitizeText = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

export async function POST(request: Request, context: { params: Promise<{ product_id: string }> }) {
  const { product_id: productId } = await context.params;
  const redirectBase = new URL(`/product/stages/${encodeURIComponent(productId)}`, request.url);

  try {
    const formData = await request.formData();

    const recipientName = sanitizeText(formData.get("recipient_name"));
    const recipientQuality = sanitizeText(formData.get("recipient_quality"));
    const recipientSex = sanitizeText(formData.get("recipient_sex"));
    const companyName = sanitizeText(formData.get("company_name"));
    const companyLocation = sanitizeText(formData.get("company_location"));

    if (!recipientName || !recipientQuality || !companyName || !companyLocation || (recipientSex !== "M" && recipientSex !== "F")) {
      redirectBase.searchParams.set("stage_error", "Informations invalides");
      return NextResponse.redirect(redirectBase);
    }

    await createStageLetterRequestNotification({
      productId,
      recipientName,
      recipientQuality,
      recipientSex,
      companyName,
      companyLocation,
    });

    redirectBase.searchParams.set("stage_request", "success");
    return NextResponse.redirect(redirectBase);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la generation du document.";

    if (message === "auth_required") {
      return NextResponse.redirect(new URL("/signin?error=auth_required", request.url));
    }

    if (message === "resource_access_denied") {
      redirectBase.searchParams.set("stage_error", "Acces refuse");
      return NextResponse.redirect(redirectBase);
    }

    if (message === "stage_commande_not_paid") {
      redirectBase.searchParams.set("stage_error", "Paiement success requis");
      return NextResponse.redirect(redirectBase);
    }

    redirectBase.searchParams.set("stage_error", message);
    return NextResponse.redirect(redirectBase);
  }
}
