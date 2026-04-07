import { NextResponse } from "next/server";

import { generateSubjectCoverFromNotification } from "@/lib/utils/supabase/sujet-notifications";

export async function POST(_request: Request, context: { params: Promise<{ notificationSujetId: string }> }) {
  try {
    const { notificationSujetId } = await context.params;
    const normalizedId = notificationSujetId.trim();

    if (!normalizedId) {
      return new NextResponse("Identifiant de notification invalide.", { status: 400 });
    }

    const result = await generateSubjectCoverFromNotification(normalizedId);

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la generation de la page de garde.";

    if (message === "access_denied") {
      return new NextResponse("Acces refuse.", { status: 403 });
    }

    if (message === "subject_notification_not_found") {
      return new NextResponse("Notification sujet introuvable.", { status: 404 });
    }

    return new NextResponse(message, { status: 500 });
  }
}
