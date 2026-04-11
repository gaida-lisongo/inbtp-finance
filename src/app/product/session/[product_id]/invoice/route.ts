import { NextResponse } from "next/server";

import { DocumentSession } from "@/lib/documents";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getProductPageData, getCommandeStudentDisplayName } from "@/lib/utils/supabase/commandes";

type SessionMatiereRow = {
  matiere?: string | null;
  date_epreuve?: string | null;
  date?: string | null;
};

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseSessionMatieres = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as Array<{ matiere: string; dateEpreuve: string }>;
  }

  return (value as SessionMatiereRow[])
    .map((item) => {
      const matiere = normalizeText(item?.matiere ?? null);
      const dateEpreuve = normalizeText(item?.date_epreuve ?? item?.date ?? null);

      if (!matiere || !dateEpreuve) {
        return null;
      }

      return { matiere, dateEpreuve };
    })
    .filter(Boolean) as Array<{ matiere: string; dateEpreuve: string }>;
};

const appBaseUrl = process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "");

export async function GET(_request: Request, context: { params: Promise<{ product_id: string }> }) {
  try {
    const { product_id: productId } = await context.params;
    const productData = await getProductPageData("session", productId);

    if (!productData.hasPaidAccess) {
      return new NextResponse("Le paiement est requis pour generer ce macaron.", { status: 403 });
    }

    const admin = createAdminClient();
    const { data: sessionRow, error: sessionError } = await admin
      .from("session")
      .select("id, designation, date_debut, date_fin, matieres, montant")
      .eq("id", productId)
      .maybeSingle();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (!sessionRow) {
      return new NextResponse("Session introuvable.", { status: 404 });
    }

    const orderReference = productData.existingSuccessCommande?.orderNumber ?? productData.existingSuccessCommande?.id ?? productId;
    const verificationBaseUrl = appBaseUrl ?? "http://localhost:3000";
    const verificationUrl = `${verificationBaseUrl}/api/checking/session/${productId}?student_id=${encodeURIComponent(
      productData.student.id,
    )}&order=${encodeURIComponent(orderReference)}`;

    const sessionTitle =
      typeof (sessionRow as { designation?: string | null }).designation === "string" &&
      (sessionRow as { designation?: string | null }).designation?.trim().length
        ? ((sessionRow as { designation?: string | null }).designation as string)
        : productData.resource.title;

    const document = new DocumentSession({
      sessionTitle,
      sessionPeriod: {
        start: (sessionRow as { date_debut?: string | null }).date_debut ?? null,
        end: (sessionRow as { date_fin?: string | null }).date_fin ?? null,
      },
      amount: (sessionRow as { montant?: number | null }).montant ?? null,
      student: {
        fullName: getCommandeStudentDisplayName(productData.student),
        email: productData.student.email,
        telephone: productData.student.telephone,
      },
      orderReference,
      matieres: parseSessionMatieres((sessionRow as { matieres?: unknown }).matieres),
      verificationUrl,
    });

    const pdfBuffer = await document.generateBuffer();
    const filename = `macaron-session-${productData.student.id}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la generation du macaron.";

    if (message === "auth_required") {
      return new NextResponse("Authentification requise.", { status: 401 });
    }

    if (message === "resource_access_denied") {
      return new NextResponse("Acces refuse a cette session.", { status: 403 });
    }

    return new NextResponse(message, { status: 500 });
  }
}
