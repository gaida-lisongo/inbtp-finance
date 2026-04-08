import { NextResponse } from "next/server";

import { generateStageLetterFromNotification } from "@/lib/utils/supabase/stage-notifications";

export async function POST(_request: Request, context: { params: Promise<{ notificationStageId: string }> }) {
  try {
    const { notificationStageId } = await context.params;
    const parsedId = Number(notificationStageId);

    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      return new NextResponse("Identifiant de notification invalide.", { status: 400 });
    }

    const result = await generateStageLetterFromNotification(parsedId);

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la generation de la lettre.";

    if (message === "access_denied") {
      return new NextResponse("Acces refuse.", { status: 403 });
    }

    if (message === "stage_notification_not_found") {
      return new NextResponse("Notification stage introuvable.", { status: 404 });
    }

    return new NextResponse(message, { status: 500 });
  }
}
