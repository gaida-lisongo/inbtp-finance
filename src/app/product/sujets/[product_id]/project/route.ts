import { NextResponse } from "next/server";

import { createSubjectResearchRequestNotification } from "@/lib/utils/supabase/sujet-notifications";

type SubjectSection = {
  section: string;
  content: string;
};

const sanitizeText = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.replace(/\r\n/g, "\n").trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const parseStringArray = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
};

const parseStructuredArray = (value: FormDataEntryValue | null): SubjectSection[] => {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const section = typeof (item as Record<string, unknown>).section === "string" ? (item as Record<string, unknown>).section : "";
      const content = typeof (item as Record<string, unknown>).content === "string" ? (item as Record<string, unknown>).content : "";

      return [{ section, content }];
    });
  } catch {
    return [];
  }
};

export async function POST(request: Request, context: { params: Promise<{ product_id: string }> }) {
  const { product_id: productId } = await context.params;
  const redirectBase = new URL(`/product/sujets/${encodeURIComponent(productId)}`, request.url);

  try {
    const formData = await request.formData();
    const title = sanitizeText(formData.get("subject_title"));
    const director = sanitizeText(formData.get("director_name"));
    const coDirector = sanitizeText(formData.get("co_director_name"));
    const thematique = parseStringArray(formData.get("thematique_json"));
    const justification = parseStringArray(formData.get("justification_json"));
    const problematique = parseStringArray(formData.get("problematique_json"));
    const objectif = parseStringArray(formData.get("objectif_json"));
    const methodologie = parseStructuredArray(formData.get("methodologie_json"));
    const resultatsAttendus = parseStructuredArray(formData.get("resultats_attendus_json"));
    const chronogrammes = parseStructuredArray(formData.get("chronogrammes_json"));
    const references = parseStructuredArray(formData.get("references_json"));

    if (!title || !director) {
      redirectBase.searchParams.set("sujet_error", "Informations invalides");
      return NextResponse.redirect(redirectBase);
    }

    const result = await createSubjectResearchRequestNotification({
      productId,
      title,
      director,
      coDirector,
      thematique,
      justification,
      problematique,
      objectif,
      methodologie,
      resultatsAttendus,
      chronogrammes,
      references,
    });

    redirectBase.searchParams.set("sujet_request", "success");
    redirectBase.searchParams.set("sujet_notification", result.notificationSujetId);

    return NextResponse.redirect(redirectBase);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la soumission du sujet.";

    if (message === "auth_required") {
      return NextResponse.redirect(new URL("/signin?error=auth_required", request.url));
    }

    if (message === "resource_access_denied") {
      redirectBase.searchParams.set("sujet_error", "Acces refuse");
      return NextResponse.redirect(redirectBase);
    }

    if (message === "sujet_commande_not_paid") {
      redirectBase.searchParams.set("sujet_error", "Paiement success requis");
      return NextResponse.redirect(redirectBase);
    }

    if (message === "subject_request_invalid") {
      redirectBase.searchParams.set("sujet_error", "Titre et directeur sont obligatoires");
      return NextResponse.redirect(redirectBase);
    }

    if (message === "subject_request_already_delivered") {
      redirectBase.searchParams.set("sujet_error", "Ressource deja delivree. Nouvelle soumission bloquee.");
      return NextResponse.redirect(redirectBase);
    }

    redirectBase.searchParams.set("sujet_error", message);
    return NextResponse.redirect(redirectBase);
  }
}
