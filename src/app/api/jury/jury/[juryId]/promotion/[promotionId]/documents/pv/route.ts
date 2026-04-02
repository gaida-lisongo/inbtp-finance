import { NextResponse } from "next/server";

import Document from "@/utils/excel/Document";
import DocumentPV from "@/utils/excel/DocumentPV";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getJuryById, getNotesForProgramme } from "@/lib/utils/supabase/jury";
import { getProgrammeById } from "@/lib/utils/supabase/programmes";
import { NoteManager } from "@/utils/excel/NoteManager";

type RouteParams = {
  juryId?: string;
  promotionId?: string;
};

const buildFullName = (
  person:
    | {
        prenom?: string | null;
        post_nom?: string | null;
        nom?: string | null;
      }
    | null
    | undefined,
) => [person?.prenom, person?.post_nom, person?.nom].filter(Boolean).join(" ").trim() || null;

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

export async function GET(
  _: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const resolvedParams = await params;
  const juryId = resolvedParams.juryId;
  const promotionId = resolvedParams.promotionId;

  if (!juryId || !promotionId) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  const user = await getAuthenticatedUser();
  if (!user || !user.canManageCharges || !user.agentId || user.role !== "titulaire") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const jury = await getJuryById(juryId);
  if (!jury) {
    return NextResponse.json({ error: "Jury introuvable." }, { status: 404 });
  }

  const isMember = jury.president_id === user.agentId || jury.secretaire_id === user.agentId;
  if (!isMember) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  if (jury.isActivate !== true) {
    return NextResponse.json({ error: "Jury inactif." }, { status: 403 });
  }

  const programme = await getProgrammeById(promotionId);
  if (!programme) {
    return NextResponse.json({ error: "Promotion introuvable." }, { status: 404 });
  }

  if (jury.annee_id && programme.annee_id && jury.annee_id !== programme.annee_id) {
    return NextResponse.json({ error: "Promotion invalide pour ce jury." }, { status: 403 });
  }

  const notes = await getNotesForProgramme(promotionId);
  const resultats = NoteManager.classerParPourcentage(
    NoteManager.calculerResultatsPromotion(notes),
  );

  const document = new DocumentPV();
  await document.generate(resultats, {
    id: jury.id,
    designation: jury.designation,
    promotion: programme.designation,
    annee: jury.annee
      ? {
          id: jury.annee.id,
          designation: jury.annee.designation,
        }
      : null,
    president: jury.president
      ? {
          id: jury.president.id,
          nomComplet: buildFullName(jury.president),
        }
      : null,
    secretaire: jury.secretaire
      ? {
          id: jury.secretaire.id,
          nomComplet: buildFullName(jury.secretaire),
        }
      : null,
  });

  const buffer = await document.generateBuffer();
  const filename = slugify(`pv-deliberation-${programme.designation ?? "promotion"}`) || "pv-deliberation";

  return Document.createResponse(buffer, filename);
}
