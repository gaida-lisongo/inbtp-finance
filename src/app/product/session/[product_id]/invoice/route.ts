import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getProductPageData, getCommandeStudentDisplayName } from "@/lib/utils/supabase/commandes";
import DocumentMacaron from "@/utils/pdf/DocumentMacaron";

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
const formatDocumentDate = (value: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);

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
      .select("id, designation, date_debut, date_fin, matieres, montant, programme_id")
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
    const verificationUrl = `${verificationBaseUrl}/api/verify/session/${productId}?student_id=${encodeURIComponent(productData.student.id)}&order=${encodeURIComponent(orderReference)}`;

    const sessionTitle =
      typeof (sessionRow as { designation?: string | null }).designation === "string" &&
      (sessionRow as { designation?: string | null }).designation?.trim().length
        ? ((sessionRow as { designation?: string | null }).designation as string)
        : productData.resource.title;

    const sessionProgrammeId =
      typeof (sessionRow as { programme_id?: string | null }).programme_id === "string" &&
      (sessionRow as { programme_id?: string | null }).programme_id?.trim()
        ? ((sessionRow as { programme_id: string }).programme_id.trim() as string)
        : null;

    const programmePromise = sessionProgrammeId
      ? admin.from("programmes").select("id, designation, annee_id, systeme").eq("id", sessionProgrammeId).maybeSingle()
      : Promise.resolve({ data: null, error: null });
    const studentPromise = admin.from("students").select("ville, adresse").eq("id", productData.student.id).maybeSingle();
    const parcoursPromise = sessionProgrammeId
      ? admin
          .from("parcours")
          .select("reference, programme_id, created_at")
          .eq("student_id", productData.student.id)
          .eq("programme_id", sessionProgrammeId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const [
      { data: programmeData, error: programmeError },
      { data: studentRow, error: studentError },
      { data: parcoursData, error: parcoursError },
    ] = await Promise.all([programmePromise, studentPromise, parcoursPromise]);

    if (programmeError) {
      throw new Error(programmeError.message);
    }

    if (studentError) {
      throw new Error(studentError.message);
    }

    if (parcoursError) {
      throw new Error(parcoursError.message);
    }

    const programme = (programmeData ?? null) as {
      id: string;
      designation: string | null;
      annee_id: string | null;
      systeme: string | null;
    } | null;
    const parcours = (parcoursData ?? null) as {
      reference: string | null;
    } | null;

    const { data: anneeData, error: anneeError } =
      programme?.annee_id && programme.annee_id.trim().length > 0
        ? await admin.from("annees").select("designation").eq("id", programme.annee_id).maybeSingle()
        : { data: null, error: null };

    if (anneeError) {
      throw new Error(anneeError.message);
    }

    const payload = {
      student: {
        nom: getCommandeStudentDisplayName(productData.student),
        sexe: "M",
        ville:
          typeof (studentRow as { ville?: string | null } | null)?.ville === "string" &&
          (studentRow as { ville?: string | null }).ville?.trim()
            ? (studentRow as { ville: string }).ville.trim()
            : "Non renseignee",
      },
      parcour: {
        promotion:
          typeof programme?.designation === "string" && programme.designation.trim().length > 0 ? programme.designation.trim() : sessionTitle,
        systeme: typeof programme?.systeme === "string" && programme.systeme.trim().length > 0 ? programme.systeme.trim() : "LMD",
        matricule:
          typeof parcours?.reference === "string" && parcours.reference.trim().length > 0 ? parcours.reference.trim() : "Non renseigne",
        annee:
          typeof (anneeData as { designation?: string | null } | null)?.designation === "string" &&
          (anneeData as { designation?: string | null }).designation?.trim()
            ? (anneeData as { designation: string }).designation.trim()
            : "Non renseignee",
      },
      contact: {
        email: productData.student.email ?? "Non renseigne",
        telephone: productData.student.telephone ?? "Non renseigne",
        adresse:
          typeof (studentRow as { adresse?: string | null } | null)?.adresse === "string" &&
          (studentRow as { adresse?: string | null }).adresse?.trim()
            ? (studentRow as { adresse: string }).adresse.trim()
            : "Non renseignee",
      },
      document: {
        type: "Macaron " + sessionTitle,
        ressource: sessionTitle,
        detail: `La session va de la période allant du ${(sessionRow as { date_debut?: string | null }).date_debut ?? null} au ${(sessionRow as { date_fin?: string | null }).date_fin ?? null}`,
        reference: `INBTP/BTP/SES/${(new Date).getFullYear()}/${(Date.now()).toString().slice(-5)}`,
        dateCreate: formatDocumentDate(new Date()),
        other: `Montant: ${typeof (sessionRow as { montant?: number | null }).montant === "number" ? (sessionRow as { montant: number }).montant : "Non renseigne"} USD`,
      },
      session: {
        title: sessionTitle,
        amount: (sessionRow as { montant?: number | null }).montant ?? null,
        period: {
          start: (sessionRow as { date_debut?: string | null }).date_debut ?? null,
          end: (sessionRow as { date_fin?: string | null }).date_fin ?? null,
        },
      },
      matieres: parseSessionMatieres((sessionRow as { matieres?: unknown }).matieres),
      verificationUrl,
    };

    const document = new DocumentMacaron(payload);
    document.info({
      title: `Macaron session - ${payload.student.nom}`,
      author: "Dashboard Agents",
      subject: "Macaron etudiant session",
      keywords: "session, macaron, invoice, qr, etudiant",
    });

    await document.generate();

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
