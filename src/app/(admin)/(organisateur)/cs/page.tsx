import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { confirmRetraitAction, createRetraitAction, deleteRetraitAction } from "@/app/(admin)/(organisateur)/cs/actions";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ChefSectionRetraitsPanel from "@/components/retraits/ChefSectionRetraitsPanel";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { getAnnees } from "@/lib/utils/supabase/annees";
import { getProgrammeById, getProgrammes } from "@/lib/utils/supabase/programmes";
import { getRetraitsForAgent } from "@/lib/utils/supabase/retraits";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export const metadata: Metadata = {
  title: "Chef de Section | Dashboard Agents",
  description: "Page metier dediee a l'autorisation Chef de Section.",
};

type ChefSectionPageProps = {
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
    if (message === "designation_required") {
      return "La designation du retrait est obligatoire.";
    }

    if (message === "categorie_required") {
      return "La categorie du retrait est obligatoire.";
    }

    if (message === "montant_required") {
      return "Le montant du retrait est obligatoire.";
    }

    if (message === "annee_required") {
      return "L'annee du retrait est obligatoire.";
    }

    if (message === "programme_required") {
      return "La promotion du retrait est obligatoire.";
    }

    if (message === "invalid_montant") {
      return "Le montant doit etre un nombre strictement positif.";
    }

    if (message === "only_draft_retrait_can_be_confirmed") {
      return "Seuls les retraits en brouillon peuvent etre confirmes.";
    }

    if (message === "only_pending_retrait_can_be_deleted") {
      return "Seuls les retraits avec le statut pending peuvent etre supprimes.";
    }

    if (message === "retrait_not_found") {
      return "Le retrait demande est introuvable ou n'appartient pas a cet agent.";
    }

    if (message === "access_denied") {
      return "Acces refuse pour cette operation.";
    }

    if (message === "control_mail_not_configured") {
      return "La variable d'environnement CONTROL_MAIL est absente.";
    }

    if (message === "app_origin_not_available") {
      return "Impossible de generer le lien absolu vers la demande.";
    }

    return message;
  }

  return null;
};

export default async function ChefSectionPage({ searchParams }: ChefSectionPageProps) {
  const [user, queryParams] = await Promise.all([getAuthenticatedUser(), searchParams]);

  if (!user || !user.canAccessAdmin || !user.agentId) {
    redirect("/signin?error=access_denied");
  }

  const anneeId = queryParams.annee;
  const promotionId = queryParams.promotion;

  if (!anneeId || !promotionId) {
    redirect("/");
  }

  const [activeCodes, annees, programme, programmes, retraits] = await Promise.all([
    getActiveAutorisationCodesForAgent(user.agentId),
    getAnnees(),
    getProgrammeById(promotionId),
    getProgrammes(),
    getRetraitsForAgent(user.agentId, anneeId, promotionId),
  ]);

  if (!activeCodes.includes("CS")) {
    redirect("/signin?error=access_denied");
  }

  const annee = annees.find((item) => item.id === anneeId) ?? null;
  const programmeDetails = programmes.find((item) => item.id === promotionId && item.annee_id === anneeId) ?? null;
  const feedbackMessage = getFeedbackMessage(queryParams.status, queryParams.message);

  if (!annee || !programme || !programmeDetails) {
    redirect("/");
  }

  return (
    <div>
      <PageBreadcrumb pageTitle={`Chef de Section - ${programmeDetails.designation || "Promotion"}`} />

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
          desc="Le chef de section peut creer ses retraits, les consulter en temps reel et supprimer uniquement ceux qui sont encore en pending."
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

        <ChefSectionRetraitsPanel
          retraits={retraits}
          agentId={user.agentId}
          anneeId={anneeId}
          promotionId={promotionId}
          programmeDesignation={programmeDetails.designation || "Promotion"}
          anneeDesignation={annee.designation || "Annee academique"}
          createAction={createRetraitAction}
          deleteAction={deleteRetraitAction}
          confirmAction={confirmRetraitAction}
        />
      </div>
    </div>
  );
}
