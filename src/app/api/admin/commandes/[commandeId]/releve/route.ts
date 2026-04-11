import { NextResponse } from "next/server";

import { generateReleveForFaculty } from "@/lib/utils/supabase/faculty-commandes";

export async function POST(_request: Request, context: { params: Promise<{ commandeId: string }> }) {
  try {
    const { commandeId } = await context.params;
    const result = await generateReleveForFaculty(commandeId);

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

    if (message === "invalid_releve_commande") {
      return new NextResponse("Cette commande n'est pas un relevé.", { status: 400 });
    }

    if (message === "releve_commande_not_paid") {
      return new NextResponse("Le statut success est requis pour la generation.", { status: 400 });
    }

    if (message === "releve_notes_missing") {
      return new NextResponse("Aucune note disponible pour cet etudiant.", { status: 404 });
    }

    return new NextResponse(message, { status: 500 });
  }
}

