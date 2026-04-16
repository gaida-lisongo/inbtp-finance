import { NextResponse } from "next/server";

import PdfDocumentSujet from "@/utils/pdf/DocumentSujet";
import { getSubjectDocumentPayloadFromNotification } from "@/lib/utils/supabase/sujet-notifications";

export async function POST(request: Request, context: { params: Promise<{ notificationSujetId: string }> }) {
  try {
    const { notificationSujetId } = await context.params;
    const normalizedId = notificationSujetId.trim();

    if (!normalizedId) {
      return new NextResponse("Identifiant de notification invalide.", { status: 400 });
    }

    const result = await getSubjectDocumentPayloadFromNotification(normalizedId);
    const document = new PdfDocumentSujet(result.payload);
    const verifyUrl = `${new URL(request.url).origin}/api/verify/sujet/${encodeURIComponent(normalizedId)}?type=protocol`;

    await document.generate(verifyUrl, "Protocle");
    const buffer = await document.generateBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="protocole-sujet-${normalizedId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de l'ouverture du protocole de recherche.";

    if (message === "access_denied") {
      return new NextResponse("Acces refuse.", { status: 403 });
    }

    if (message === "subject_notification_not_found") {
      return new NextResponse("Notification sujet introuvable.", { status: 404 });
    }

    return new NextResponse(message, { status: 500 });
  }
}
