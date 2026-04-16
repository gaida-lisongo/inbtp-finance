import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getDocumentCategory } from "@/lib/utils/supabase/documents-shared";
import { getNotesForProgramme } from "@/lib/utils/supabase/jury";
import { getProductPageData, getCommandeStudentDisplayName } from "@/lib/utils/supabase/commandes";
import { getProgrammeById } from "@/lib/utils/supabase/programmes";
import { NoteManager } from "@/utils/excel/NoteManager";
import DocumentValidation from "@/utils/pdf/DocumentValidation";

const appBaseUrl = process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "");

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
};

export async function GET(_request: Request, context: { params: Promise<{ product_id: string }> }) {
  try {
    const { product_id: productId } = await context.params;
    const productData = await getProductPageData("documents", productId);

    if (!productData.hasPaidAccess) {
      return new NextResponse("Le paiement est requis pour generer cette fiche.", { status: 403 });
    }

    const normalizedDocumentCategory = normalizeText(productData.resource.documentCategory);

    if (normalizedDocumentCategory !== "fiche de validation") {
      return new NextResponse("Ce document n'est pas une fiche de validation.", { status: 400 });
    }

    const programmeId = productData.resource.programmeId;

    if (!programmeId) {
      return new NextResponse("Programme associe introuvable pour cette fiche.", { status: 400 });
    }

    const [programme, notes] = await Promise.all([getProgrammeById(programmeId), getNotesForProgramme(programmeId)]);
    const studentResult = NoteManager.calculerResultatsPromotion(notes).find((item) => item.studentId === productData.student.id) ?? null;

    if (!studentResult) {
      return new NextResponse("Aucune note disponible pour generer la fiche de validation.", { status: 404 });
    }

    const orderReference = productData.existingSuccessCommande?.orderNumber ?? productData.existingSuccessCommande?.id ?? productId;
    const verificationBaseUrl = appBaseUrl ?? "http://localhost:3000";
    const verificationUrl = `${verificationBaseUrl}/api/checking/validation/${productId}?student_id=${encodeURIComponent(productData.student.id)}&order=${encodeURIComponent(orderReference)}`;

    const semestres = studentResult.semestres.map((semestre) => {
      const unites = semestre.unites.map((unite) => ({
        code: unite.code,
        designation: unite.designation,
        statut: unite.isValide ? ("V" as const) : ("NV" as const),
        credit: unite.credit,
        matieres: unite.elements.map((element) => ({
          designation: element.designation,
          credit: element.credit,
        })),
      }));

      const casserolesCount = semestre.unites.reduce(
        (sum, unite) => sum + unite.elements.filter((element) => element.noteFinale < 10).length,
        0,
      );

      return {
        designation: semestre.designation,
        totalCredits: semestre.credit,
        unites,
        validatedCredits: semestre.ncv,
        nonValidatedCredits: semestre.ncnv,
        casserolesCount,
      };
    });

    const admin = createAdminClient();
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

    if (documentCategory.trim().toLowerCase() !== "fiche de validation") {
      return new NextResponse("Ce document n'est pas une fiche de validation.", { status: 400 });
    }

    const payload = {
      studentName: getCommandeStudentDisplayName(productData.student),
      studentEmail: productData.student.email ?? null,
      studentPhone: productData.student.telephone ?? null,
      matricule: studentResult.matricule || "Non renseigne",
      programmeName: programme?.designation ?? "Promotion",
      orderReference,
      semestres,
      verificationUrl,
    };

    const document = new DocumentValidation(payload);
    document.info({
      title: `Fiche de validation - ${payload.studentName}`,
      author: "Dashboard Agents",
      subject: "Validation des credits par semestre",
      keywords: "validation, credits, semestre, unites, matieres",
    });

    await document.generate(verificationUrl);
    const pdfBuffer = await document.generateBuffer();
    const filename = `fiche-validation-${productData.student.id}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la generation de la fiche de validation.";

    if (message === "auth_required") {
      return new NextResponse("Authentification requise.", { status: 401 });
    }

    if (message === "resource_access_denied") {
      return new NextResponse("Acces refuse a cette ressource.", { status: 403 });
    }

    return new NextResponse(message, { status: 500 });
  }
}
