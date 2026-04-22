import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createCoursChannelAction, createMatiereAction, deleteMatiereAction, saveCoursAction } from "@/app/(admin)/(organisateur)/ce/unite/actions";
import ComponentCard from "@/components/common/ComponentCard";
import MatiereCoursPanel from "@/components/enseignement/MatiereCoursPanel";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import UniteDetailsPanel from "@/components/enseignement/UniteDetailsPanel";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { getAnnees } from "@/lib/utils/supabase/annees";
import {
  getCoursByMatiereId,
  getCoursByMatiereIds,
  getEnseignantsForCours,
  getMatieresByUnite,
  getSemestreById,
  getUniteById,
} from "@/lib/utils/supabase/enseignement";
import { getProgrammeById } from "@/lib/utils/supabase/programmes";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export const metadata: Metadata = {
  title: "Detail Unite | Dashboard Agents",
  description: "Gestion des elements constitutifs d'une unite d'enseignement.",
};

type UnitePageProps = {
  searchParams: Promise<{
    annee?: string;
    promotion?: string;
    unite?: string;
    matiere?: string;
    status?: string;
    message?: string;
  }>;
};

const getFeedbackMessage = (status?: string, message?: string) => {
  if (status === "success") {
    return "Operation effectuee avec succes.";
  }

  if (status === "error" && message) {
    switch (message) {
      case "matiere_designation_required":
        return "La designation de la matiere est obligatoire.";
      case "matiere_credits_invalid":
        return "Les credits de la matiere doivent etre un entier positif ou nul.";
      case "matiere_credits_exceed_unite":
        return "Le total des credits des matieres ne doit pas depasser les credits de l'unite.";
      case "unite_required":
        return "Une unite doit etre selectionnee.";
      case "matiere_required":
        return "Une matiere doit etre selectionnee.";
      case "cours_enseignant_required":
        return "L'enseignant du cours est obligatoire.";
      case "cours_enseignant_invalid":
        return "L'enseignant selectionne est introuvable.";
      case "cours_slug_required":
        return "Le nom du canal Teams est obligatoire.";
      case "cours_channel_name_required":
        return "Le nom du canal Teams est obligatoire.";
      case "cours_required":
        return "Le cours doit d'abord etre configure avant de creer le canal.";
      case "programme_team_required":
        return "La promotion doit d'abord etre associee a une equipe Teams.";
      case "Authorization_RequestDenied":
        return "Permissions Microsoft Graph insuffisantes pour creer le canal Teams. Verifiez les permissions application et le consentement admin.";
      case "access_denied":
        return "Acces refuse a cette page.";
      default:
        return message;
    }
  }

  return null;
};

export default async function UnitePage({ searchParams }: UnitePageProps) {
  const [user, queryParams] = await Promise.all([getAuthenticatedUser(), searchParams]);

  if (!user || !user.canAccessAdmin || !user.agentId) {
    redirect("/signin?error=access_denied");
  }

  const anneeId = queryParams.annee;
  const promotionId = queryParams.promotion;
  const uniteId = queryParams.unite;
  const matiereId = queryParams.matiere;

  if (!anneeId || !promotionId || !uniteId) {
    redirect("/");
  }

  const [activeCodes, anneeList, programme, unite, matieres] = await Promise.all([
    getActiveAutorisationCodesForAgent(user.agentId),
    getAnnees(),
    getProgrammeById(promotionId),
    getUniteById(uniteId),
    getMatieresByUnite(uniteId),
  ]);

  if (!activeCodes.includes("CE")) {
    redirect("/signin?error=access_denied");
  }

  if (!unite || !programme) {
    redirect("/");
  }

  const semestre = unite.semestre_id ? await getSemestreById(unite.semestre_id) : null;
  const annee = anneeList.find((item) => item.id === anneeId) ?? null;

  if (!annee || !semestre || semestre.programme_id !== promotionId) {
    redirect("/");
  }

  const coursList = await getCoursByMatiereIds(matieres.map((matiere) => matiere.id));
  const coursByMatiereId = Object.fromEntries(
    matieres.map((matiere) => [matiere.id, coursList.find((cours) => cours.matiere_id === matiere.id) ?? null]),
  );

  const selectedMatiere = matiereId ? matieres.find((matiere) => matiere.id === matiereId) ?? null : null;

  if (matiereId && !selectedMatiere) {
    redirect(`/ce/unite?annee=${anneeId}&promotion=${promotionId}&unite=${unite.id}&status=error&message=matiere_required`);
  }

  if (selectedMatiere && selectedMatiere.unite_id !== unite.id) {
    redirect(`/ce/unite?annee=${anneeId}&promotion=${promotionId}&unite=${unite.id}&status=error&message=matiere_required`);
  }

  const feedbackMessage = getFeedbackMessage(queryParams.status, queryParams.message);
  const [cours, enseignants] = selectedMatiere
    ? await Promise.all([getCoursByMatiereId(selectedMatiere.id), getEnseignantsForCours()])
    : [null, []];

  return (
    <div>
      <PageBreadcrumb 
        pageTitle={'Unité d\'enseignement'}
        pageRoot="Dashboard"
        detailPage={`Unite - ${unite.designation || "Detail"}`}
        path="/"
      />

      <div className="space-y-6">
        {queryParams.status === "success" && feedbackMessage ? (
          <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
            {feedbackMessage}
          </div>
        ) : null}

        {queryParams.status === "error" && feedbackMessage ? (
          <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
            {feedbackMessage}
          </div>
        ) : null}

        <ComponentCard
          title={programme.designation || "Promotion"}
          desc={`Semestre: ${semestre.designation || "Semestre"} • Annee: ${annee.designation || "Annee"}`}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Promotion</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {programme.designation || "Non renseignee"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Semestre</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {semestre.designation || "Non renseigne"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Annee</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {annee.designation || "Non renseignee"}
              </p>
            </div>
          </div>
        </ComponentCard>

        {selectedMatiere ? (
          <MatiereCoursPanel
            anneeId={anneeId}
            promotionId={promotionId}
            programmeLabel={programme.designation || "Promotion"}
            programmeTeamId={programme.groupe_id}
            uniteId={unite.id}
            matiere={selectedMatiere}
            cours={cours}
            enseignants={enseignants}
            saveCoursAction={saveCoursAction}
            createCoursChannelAction={createCoursChannelAction}
          />
        ) : (
          <UniteDetailsPanel
            anneeId={anneeId}
            promotionId={promotionId}
            unite={unite}
            matieres={matieres}
            coursByMatiereId={coursByMatiereId}
            createMatiereAction={createMatiereAction}
            deleteMatiereAction={deleteMatiereAction}
          />
        )}
      </div>
    </div>
  );
}
