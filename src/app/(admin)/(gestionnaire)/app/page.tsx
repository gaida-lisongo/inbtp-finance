import { redirect } from "next/navigation";
import type { Metadata } from "next";

import AppManagementPanel from "@/components/appariteur/AppManagementPanel";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getParcoursById, getParcoursByProgramme, getSessionById, getSessionsByProgramme } from "@/lib/utils/supabase/appariteur";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { getAnnees } from "@/lib/utils/supabase/annees";
import { getProgrammeById, getProgrammes } from "@/lib/utils/supabase/programmes";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getStudents } from "@/lib/utils/supabase/students";

export const metadata: Metadata = {
  title: "Appariteur | Dashboard Agents",
  description: "Page metier dediee a l'autorisation Appariteur.",
};

type AppariteurPageProps = {
  searchParams: Promise<{
    annee?: string;
    promotion?: string;
    status?: string;
    message?: string;
    sessionEdit?: string;
    parcoursEdit?: string;
    mode?: string;
  }>;
};

export default async function AppariteurPage({ searchParams }: AppariteurPageProps) {
  const [user, queryParams] = await Promise.all([getAuthenticatedUser(), searchParams]);

  if (!user || !user.canAccessAdmin || !user.agentId) {
    redirect("/signin?error=access_denied");
  }

  const anneeId = queryParams.annee;
  const promotionId = queryParams.promotion;

  if (!anneeId || !promotionId) {
    redirect("/");
  }

  const [activeCodes, annees, programme, programmes] = await Promise.all([
    getActiveAutorisationCodesForAgent(user.agentId),
    getAnnees(),
    getProgrammeById(promotionId),
    getProgrammes(),
  ]);

  if (!activeCodes.includes("APP")) {
    redirect("/signin?error=access_denied");
  }

  const annee = annees.find((item) => item.id === anneeId) ?? null;
  const programmeDetails = programmes.find((item) => item.id === promotionId && item.annee_id === anneeId) ?? null;

  if (!annee || !programme || !programmeDetails) {
    redirect("/");
  }

  const [sessions, parcours, students, sessionCandidate, parcoursCandidate] = await Promise.all([
    getSessionsByProgramme(promotionId),
    getParcoursByProgramme(promotionId),
    getStudents(),
    queryParams.sessionEdit ? getSessionById(queryParams.sessionEdit) : Promise.resolve(null),
    queryParams.parcoursEdit ? getParcoursById(queryParams.parcoursEdit) : Promise.resolve(null),
  ]);

  const editingSession = sessionCandidate?.programme_id === promotionId ? sessionCandidate : null;
  const editingParcours = parcoursCandidate?.programme_id === promotionId ? parcoursCandidate : null;

  return (
    <div>
      <PageBreadcrumb pageTitle={`Appariteur - ${programmeDetails.designation || "Promotion"}`} />

      <div className="space-y-6">
        <ComponentCard
          title={programmeDetails.designation || "Promotion"}
          desc="Point d'entree du metier Appariteur."
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

        <AppManagementPanel
          anneeId={anneeId}
          programmeId={promotionId}
          sessions={sessions}
          parcours={parcours}
          students={students}
          editingSession={editingSession}
          editingParcours={editingParcours}
          mode={queryParams.mode}
          status={queryParams.status}
          message={queryParams.message}
        />
      </div>
    </div>
  );
}
