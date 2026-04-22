import { redirect } from "next/navigation";
import type { Metadata } from "next";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ChargeRecherchePanel from "@/components/recherche/ChargeRecherchePanel";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { getAnnees } from "@/lib/utils/supabase/annees";
import { getProgrammeById, getProgrammes } from "@/lib/utils/supabase/programmes";
import { getLaboratoiresByProgramme, getStagesByProgramme, getSujetsByProgramme } from "@/lib/utils/supabase/recherche";
import type { ResearchTableName } from "@/lib/utils/supabase/recherche-shared";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export const metadata: Metadata = {
  title: "Charge de la Recherche | Dashboard Agents",
  description: "Page metier dediee a l'autorisation Charge de la Recherche.",
};

type ChargeRecherchePageProps = {
  searchParams: Promise<{
    annee?: string;
    promotion?: string;
    status?: string;
    message?: string;
    tab?: string;
  }>;
};

const getFeedbackMessage = (status?: string, message?: string) => {
  if (status === "success") {
    return "Operation effectuee avec succes.";
  }

  if (status === "error" && message) {
    switch (message) {
      case "programme_required":
        return "La promotion est obligatoire pour enregistrer cet element.";
      case "montant_invalid":
        return "Le montant doit etre un nombre valide.";
      case "research_entity_required":
        return "Le type d'element a traiter est introuvable.";
      case "research_id_required":
        return "L'element a supprimer est introuvable.";
      case "access_denied":
        return "Acces refuse a la gestion de la recherche.";
      default:
        return message;
    }
  }

  return null;
};

const getDefaultTab = (value?: string): ResearchTableName => {
  if (value === "sujets" || value === "laboratoires") {
    return value;
  }

  return "stages";
};

export default async function ChargeRecherchePage({ searchParams }: ChargeRecherchePageProps) {
  const [user, queryParams] = await Promise.all([getAuthenticatedUser(), searchParams]);

  if (!user || !user.canAccessAdmin || !user.agentId) {
    redirect("/signin?error=access_denied");
  }

  const anneeId = queryParams.annee;
  const promotionId = queryParams.promotion;

  if (!anneeId || !promotionId) {
    redirect("/");
  }

  const [activeCodes, annees, programme, programmes, stages, sujets, laboratoires] = await Promise.all([
    getActiveAutorisationCodesForAgent(user.agentId),
    getAnnees(),
    getProgrammeById(promotionId),
    getProgrammes(),
    getStagesByProgramme(promotionId),
    getSujetsByProgramme(promotionId),
    getLaboratoiresByProgramme(promotionId),
  ]);

  if (!activeCodes.includes("CR")) {
    redirect("/signin?error=access_denied");
  }

  const annee = annees.find((item) => item.id === anneeId) ?? null;
  const programmeDetails = programmes.find((item) => item.id === promotionId && item.annee_id === anneeId) ?? null;
  const feedbackMessage = getFeedbackMessage(queryParams.status, queryParams.message);
  const defaultTab = getDefaultTab(queryParams.tab);

  if (!annee || !programme || !programmeDetails) {
    redirect("/");
  }

  return (
    <div>

      <PageBreadcrumb 
        pageRoot={"Dashboard"}
        path={"/"}
        detailPage={`Recherche | ${programmeDetails?.designation}`}
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
          desc="Le charge de recherche pilote ici les stages, sujets et laboratoires associes a la promotion."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Stages et sujets</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">{stages.length + sujets.length} elements</p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Laboratoires</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">{laboratoires.length} enregistrements</p>
            </div>
          </div>
        </ComponentCard>

        <ChargeRecherchePanel
          anneeId={anneeId}
          promotionId={promotionId}
          defaultTab={defaultTab}
          stages={stages}
          sujets={sujets}
          laboratoires={laboratoires}
          programmeLabel={programmeDetails.designation}
        />
      </div>
    </div>
  );
}
