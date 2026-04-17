import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getCommandeStudentDisplayName, getProductPageData } from "@/lib/utils/supabase/commandes";
import { formatResearchDescription } from "@/lib/utils/supabase/recherche-shared";
import DocumentLaboratoire from "@/utils/pdf/DocumentLaboratoire";

const appBaseUrl = process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "");

export async function GET(_request: Request, context: { params: Promise<{ product_id: string }> }) {
  try {
    const { product_id: productId } = await context.params;
    const productData = await getProductPageData("laboratoire", productId);

    if (!productData.hasPaidAccess) {
      return new NextResponse("Le paiement est requis pour generer cette facture.", { status: 403 });
    }

    const verificationBaseUrl = appBaseUrl ?? "http://localhost:3000";
    const invoiceNumber = productData.existingSuccessCommande?.orderNumber ?? productData.existingSuccessCommande?.id ?? productId;
    const admin = createAdminClient();

    const [{ data: laboratoireData, error: laboratoireError }, { data: studentData, error: studentError }] = await Promise.all([
      admin.from("laboratoires").select("id, slug, description, montant, programme_id, created_at").eq("id", productId).maybeSingle(),
      admin.from("students").select("id, email, telephone, ville, adresse").eq("id", productData.student.id).maybeSingle(),
    ]);

    if (laboratoireError) {
      throw new Error(laboratoireError.message);
    }

    if (studentError) {
      throw new Error(studentError.message);
    }

    const programmeId =
      typeof (laboratoireData as { programme_id?: string | null } | null)?.programme_id === "string" &&
      (laboratoireData as { programme_id: string }).programme_id.trim().length > 0
        ? (laboratoireData as { programme_id: string }).programme_id.trim()
        : null;

    const [{ data: programmeData, error: programmeError }, { data: parcoursData, error: parcoursError }] = await Promise.all([
      programmeId ? admin.from("programmes").select("id, designation, annee_id, systeme").eq("id", programmeId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      programmeId
        ? admin
            .from("parcours")
            .select("reference, programme_id, created_at")
            .eq("student_id", productData.student.id)
            .eq("programme_id", programmeId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (programmeError) {
      throw new Error(programmeError.message);
    }

    if (parcoursError) {
      throw new Error(parcoursError.message);
    }

    const anneeId =
      typeof (programmeData as { annee_id?: string | null } | null)?.annee_id === "string" &&
      (programmeData as { annee_id: string }).annee_id.trim().length > 0
        ? (programmeData as { annee_id: string }).annee_id.trim()
        : null;

    const { data: anneeData, error: anneeError } = anneeId
      ? await admin.from("annees").select("designation").eq("id", anneeId).maybeSingle()
      : { data: null, error: null };

    if (anneeError) {
      throw new Error(anneeError.message);
    }

    const verificationUrl = new URL(`/api/verify/laboratoire/${encodeURIComponent(productId)}`, verificationBaseUrl);
    verificationUrl.searchParams.set("student_id", productData.student.id);
    verificationUrl.searchParams.set("order", invoiceNumber);

    const document = new DocumentLaboratoire({
      student: {
        nom: getCommandeStudentDisplayName(productData.student),
        sexe: "M",
        ville: (studentData as { ville?: string | null } | null)?.ville ?? "Non renseignee",
      },
      parcour: {
        promotion: (programmeData as { designation?: string | null } | null)?.designation ?? "Non renseignee",
        systeme: (programmeData as { systeme?: string | null } | null)?.systeme ?? "Non renseigne",
        matricule: (parcoursData as { reference?: string | null } | null)?.reference ?? "Non renseigne",
        annee: (anneeData as { designation?: string | null } | null)?.designation ?? "Non renseignee",
      },
      contact: {
        email: (studentData as { email?: string | null } | null)?.email ?? productData.student.email ?? "Non renseigne",
        telephone: (studentData as { telephone?: string | null } | null)?.telephone ?? productData.student.telephone ?? "Non renseigne",
        adresse: (studentData as { adresse?: string | null } | null)?.adresse ?? "Non renseignee",
      },
      document: {
        type: "Autorisation de laboratoire",
        ressource: productData.resource.title,
        detail: formatResearchDescription((laboratoireData as { description?: unknown } | null)?.description ?? null) || "Document d'autorisation d'acces au laboratoire",
        reference: invoiceNumber,
        dateCreate: new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
          new Date((laboratoireData as { created_at?: string | null } | null)?.created_at ?? Date.now()),
        ),
      },
      laboratoire: {
        designation:
          (laboratoireData as { slug?: string | null } | null)?.slug?.trim() || productData.resource.title,
        montant: (laboratoireData as { montant?: number | null } | null)?.montant ?? productData.resource.amount ?? null,
        description: formatResearchDescription((laboratoireData as { description?: unknown } | null)?.description ?? null),
      },
      verificationUrl: verificationUrl.toString(),
    });

    document.info({
      title: `Autorisation laboratoire - ${getCommandeStudentDisplayName(productData.student)}`,
      author: "Dashboard Agents",
      subject: "Autorisation de laboratoire",
      keywords: "laboratoire, autorisation, qr, authentique",
    });
    await document.generate();

    const pdfBuffer = await document.generateBuffer();
    const filename = `autorisation-laboratoire-${productData.student.id}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la generation de l'invoice.";

    if (message === "auth_required") {
      return new NextResponse("Authentification requise.", { status: 401 });
    }

    if (message === "resource_access_denied") {
      return new NextResponse("Acces refuse a cette ressource.", { status: 403 });
    }

    return new NextResponse(message, { status: 500 });
  }
}
