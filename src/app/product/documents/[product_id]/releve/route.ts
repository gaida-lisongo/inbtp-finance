import { NextResponse } from "next/server";

import { DocumentReleve } from "@/lib/documents";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getDocumentCategory } from "@/lib/utils/supabase/documents-shared";
import { getNotesForProgramme } from "@/lib/utils/supabase/jury";
import { getProductPageData, getCommandeStudentDisplayName } from "@/lib/utils/supabase/commandes";
import { getProgrammeById } from "@/lib/utils/supabase/programmes";
import { NoteManager } from "@/utils/excel/NoteManager";

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
};

const appBaseUrl = process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "");
const buildSerialNumber = (productId: string, orderReference: string) => {
  const raw = `${orderReference}${productId}`.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length >= 14) return raw.slice(-14);
  return raw.padStart(14, "0");
};

export async function GET(_request: Request, context: { params: Promise<{ product_id: string }> }) {
  try {
    const { product_id: productId } = await context.params;
    const productData = await getProductPageData("documents", productId);
    const admin = createAdminClient();

    if (!productData.hasPaidAccess) {
      return new NextResponse("Le paiement est requis pour generer ce bulletin.", { status: 403 });
    }

    const { data: documentRow, error: documentError } = await admin
      .from("documents")
      .select("id, programme_id, caracteristique")
      .eq("id", productId)
      .maybeSingle();

    if (documentError) {
      throw new Error(documentError.message);
    }

    if (!documentRow) {
      return new NextResponse("Document introuvable.", { status: 404 });
    }

    const documentCategory = getDocumentCategory({
      caracteristique:
        documentRow.caracteristique && typeof documentRow.caracteristique === "object"
          ? (documentRow.caracteristique as Record<string, unknown>)
          : null,
    });

    if (!normalizeText(documentCategory).includes("relev")) {
      return new NextResponse("Ce document n'est pas un relevé de notes.", { status: 400 });
    }

    const programmeId = normalizeText((documentRow as { programme_id?: string | null }).programme_id);
    if (!programmeId) {
      return new NextResponse("Programme associe introuvable pour ce relevé.", { status: 400 });
    }

    const [programme, notes] = await Promise.all([getProgrammeById(programmeId), getNotesForProgramme(programmeId)]);
    const studentResult = NoteManager.calculerResultatsPromotion(notes).find((item) => item.studentId === productData.student.id) ?? null;

    if (!studentResult) {
      return new NextResponse("Aucune note disponible pour cet étudiant.", { status: 404 });
    }

    const orderReference = productData.existingSuccessCommande?.orderNumber ?? productData.existingSuccessCommande?.id ?? productId;
    const verificationBaseUrl = appBaseUrl ?? "http://localhost:3000";
    const verificationUrl = `${verificationBaseUrl}/checking/releve/${productId}?student_id=${encodeURIComponent(
      productData.student.id,
    )}&order=${encodeURIComponent(orderReference)}`;
    const serialNumber = buildSerialNumber(productId, orderReference);

    const units = studentResult.semestres.flatMap((semestre) =>
      semestre.unites.map((unite) => ({
        semestre: semestre.designation,
        code: unite.code,
        designation: unite.designation,
        statut: unite.isValide ? ("V" as const) : ("NV" as const),
        credit: unite.credit,
        moyenne: unite.sessions.best.moyenne,
        elements: (unite.elements ?? []).map((element) => ({
          designation: element.designation,
          credit: element.credit,
          cc: element.cc,
          examen: element.examen,
          noteSession: element.noteSession,
          rattrapage: element.rattrapage,
          rachat: element.rachat,
          noteFinale: element.noteFinale,
        })),
      })),
    );

    const bestSummary = studentResult.promotion;
    const decision = bestSummary.mention === "F" ? "Ajourné" : "Admis";

    const document = new DocumentReleve({
      studentName: getCommandeStudentDisplayName(productData.student),
      studentEmail: productData.student.email ?? null,
      studentPhone: productData.student.telephone ?? null,
      matricule: studentResult.matricule || "Non renseigne",
      programmeName: programme?.designation ?? "Promotion",
      orderReference,
      serialNumber,
      units,
      summary: {
        ncv: bestSummary.ncv,
        ncnv: bestSummary.ncnv,
        totalObtenu: bestSummary.totalObtenu,
        totalMax: bestSummary.totalMax,
        pourcentage: bestSummary.pourcentage,
        mention: bestSummary.mention,
        decision,
      },
      verificationUrl,
    });

    const pdfBuffer = await document.generateBuffer();
    const filename = `bulletin-${productData.student.id}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la generation du bulletin.";
    return new NextResponse(message, { status: 500 });
  }
}
