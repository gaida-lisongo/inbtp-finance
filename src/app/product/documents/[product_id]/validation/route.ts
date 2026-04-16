import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getDocumentCategory } from "@/lib/utils/supabase/documents-shared";
import { getNotesForProgramme } from "@/lib/utils/supabase/jury";
import { getProductPageData, getCommandeStudentDisplayName } from "@/lib/utils/supabase/commandes";
import { getProgrammeById } from "@/lib/utils/supabase/programmes";
import { NoteManager } from "@/utils/excel/NoteManager";
import DocumentBulletin, { type DocumentBulletinPayload } from "@/utils/pdf/DocumentBulletin";
import type { Note } from "@/utils/pdf/Document";

const appBaseUrl = process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "");

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
};

const formatDocumentDate = (value: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);

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
    const verificationUrl = `${verificationBaseUrl}/api/verify/validation/${productId}?student_id=${encodeURIComponent(productData.student.id)}&order=${encodeURIComponent(orderReference)}`;

    const bulletinNotes: Note[] = studentResult.semestres.flatMap((semestre) =>
      semestre.unites.map((unite) => {
        const noteValue = unite.isValide ? 20 : 0;

        return {
          code: unite.code,
          unite: `${semestre.designation} - ${unite.designation}`,
          credit: unite.credit,
          moyenne: noteValue,
          elements: unite.elements.map((element) => ({
            designation: element.designation,
            cc: 0,
            examen: 0,
            rattrage: noteValue,
            credit: element.credit,
          })),
        };
      }),
    );

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

    const adminStudentPromise = admin.from("students").select("*").eq("id", productData.student.id).maybeSingle();
    const adminYearPromise = programme?.annee_id
      ? admin.from("annees").select("designation").eq("id", programme.annee_id).maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const [{ data: rawStudentData, error: rawStudentError }, { data: anneeData, error: anneeError }] = await Promise.all([
      adminStudentPromise,
      adminYearPromise,
    ]);

    if (rawStudentError) {
      throw new Error(rawStudentError.message);
    }

    if (anneeError) {
      throw new Error(anneeError.message);
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

    const rawStudentRecord = (rawStudentData ?? null) as Record<string, unknown> | null;
    const studentVille =
      rawStudentRecord && typeof rawStudentRecord.ville === "string" && rawStudentRecord.ville.trim().length > 0
        ? rawStudentRecord.ville.trim()
        : "Non renseignee";
    const studentSexe =
      rawStudentRecord && typeof rawStudentRecord.sexe === "string" && rawStudentRecord.sexe.trim().length > 0
        ? rawStudentRecord.sexe.trim().toUpperCase()
        : "M";
    const documentPayload: DocumentBulletinPayload = {
      notes: bulletinNotes,
      student: {
        nom: getCommandeStudentDisplayName(productData.student),
        sexe: studentSexe,
        ville: studentVille,
      },
      parcour: {
        promotion: programme?.designation ?? "Promotion",
        systeme: programme?.systeme ?? "LMD",
        matricule: studentResult.matricule || "Non renseigne",
        annee:
          typeof (anneeData as { designation?: string | null } | null)?.designation === "string" &&
          (anneeData as { designation?: string | null }).designation?.trim()
            ? (anneeData as { designation: string }).designation.trim()
            : "Non renseignee",
      },
      contact: {
        email: productData.student.email ?? "Non renseigne",
        telephone: productData.student.telephone ?? "Non renseigne",
        adresse: studentVille,
      },
      document: {
        type: "Fiche de validation",
        ressource: programme?.designation ?? "Promotion",
        detail: "Validation des credits par semestre",
        reference: orderReference,
        dateCreate: formatDocumentDate(new Date()),
      },
    };

    const document = new DocumentBulletin(documentPayload);
    document.info({
      title: `Fiche de validation - ${getCommandeStudentDisplayName(productData.student)}`,
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
