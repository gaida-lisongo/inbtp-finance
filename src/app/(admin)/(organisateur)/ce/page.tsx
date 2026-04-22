import { redirect } from "next/navigation";
import type { Metadata } from "next";

import {
  createSemestreAction,
  createUniteAction,
  deleteSemestreAction,
  deleteUniteAction,
  updateSemestreAction,
} from "@/app/(admin)/(organisateur)/ce/actions";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ChargeEnseignementPanel from "@/components/enseignement/ChargeEnseignementPanel";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { getAnnees } from "@/lib/utils/supabase/annees";
import { getSemestresByProgramme, getUnitesBySemestreIds } from "@/lib/utils/supabase/enseignement";
import { getProgrammeById, getProgrammes } from "@/lib/utils/supabase/programmes";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export const metadata: Metadata = {
  title: "Charge de l'enseignement | Dashboard Agents",
  description: "Page metier dediee a l'autorisation Charge de l'enseignement.",
};

type ChargeEnseignementPageProps = {
  searchParams: Promise<{
    annee?: string;
    promotion?: string;
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
      case "semestre_designation_required":
        return "La designation du semestre est obligatoire.";
      case "unite_designation_required":
        return "La designation de l'unite est obligatoire.";
      case "programme_required":
        return "La promotion est obligatoire.";
      case "semestre_required":
        return "Le semestre est obligatoire pour ajouter une unite.";
      case "semestre_credits_invalid":
        return "Les credits du semestre doivent etre un entier positif ou nul.";
      case "semestre_id_required":
        return "Le semestre a modifier est introuvable.";
      case "semestre_credits_below_assigned":
        return "Les credits du semestre ne peuvent pas etre inferieurs au total deja affecte aux unites.";
      case "unite_credits_invalid":
        return "Les credits de l'unite doivent etre un entier positif ou nul.";
      case "access_denied":
        return "Acces refuse a cette page.";
      default:
        return message;
    }
  }

  return null;
};

export default async function ChargeEnseignementPage({ searchParams }: ChargeEnseignementPageProps) {
  const [user, queryParams] = await Promise.all([getAuthenticatedUser(), searchParams]);

  if (!user || !user.canAccessAdmin || !user.agentId) {
    redirect("/signin?error=access_denied");
  }

  const anneeId = queryParams.annee;
  const promotionId = queryParams.promotion;

  if (!anneeId || !promotionId) {
    redirect("/");
  }

  const [activeCodes, annees, programme, programmes, semestres] = await Promise.all([
    getActiveAutorisationCodesForAgent(user.agentId),
    getAnnees(),
    getProgrammeById(promotionId),
    getProgrammes(),
    getSemestresByProgramme(promotionId),
  ]);

  if (!activeCodes.includes("CE")) {
    redirect("/signin?error=access_denied");
  }

  const unites = await getUnitesBySemestreIds(semestres.map((semestre) => semestre.id));
  const annee = annees.find((item) => item.id === anneeId) ?? null;
  const programmeDetails = programmes.find((item) => item.id === promotionId && item.annee_id === anneeId) ?? null;
  const feedbackMessage = getFeedbackMessage(queryParams.status, queryParams.message);

  if (!annee || !programme || !programmeDetails) {
    redirect("/");
  }

  const semestresWithUnites = semestres.map((semestre) => ({
    ...semestre,
    unites: unites.filter((unite) => unite.semestre_id === semestre.id),
  }));

  return (
    <div>

      <PageBreadcrumb 
        pageRoot={"Dashboard"}
        path={"/"}
        detailPage={`Enseignement | ${programmeDetails?.designation}`}
        pageTitle={"Promotion"} 
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
          title={programmeDetails.designation || "Promotion"}
          desc="Le charge de l'enseignement structure la promotion par semestres, unites d'enseignement et elements constitutifs."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Annee academique</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {annee.designation || "Non renseignee"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Filiere</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {programmeDetails.filiereDesignation || "Non renseignee"}
              </p>
            </div>
          </div>
        </ComponentCard>

        <ChargeEnseignementPanel
          anneeId={anneeId}
          promotionId={promotionId}
          semestres={semestresWithUnites}
          createSemestreAction={createSemestreAction}
          updateSemestreAction={updateSemestreAction}
          deleteSemestreAction={deleteSemestreAction}
          createUniteAction={createUniteAction}
          deleteUniteAction={deleteUniteAction}
        />
      </div>
    </div>
  );
}
