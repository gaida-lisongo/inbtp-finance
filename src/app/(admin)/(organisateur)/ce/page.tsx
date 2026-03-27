import { redirect } from "next/navigation";
import type { Metadata } from "next";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { getAnnees } from "@/lib/utils/supabase/annees";
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
  }>;
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

  const [activeCodes, annees, programme, programmes] = await Promise.all([
    getActiveAutorisationCodesForAgent(user.agentId),
    getAnnees(),
    getProgrammeById(promotionId),
    getProgrammes(),
  ]);

  if (!activeCodes.includes("CE")) {
    redirect("/signin?error=access_denied");
  }

  const annee = annees.find((item) => item.id === anneeId) ?? null;
  const programmeDetails = programmes.find((item) => item.id === promotionId && item.annee_id === anneeId) ?? null;

  if (!annee || !programme || !programmeDetails) {
    redirect("/");
  }

  return (
    <div>
      <PageBreadcrumb pageTitle={`Charge de l'enseignement - ${programmeDetails.designation || "Promotion"}`} />

      <div className="space-y-6">
        <ComponentCard
          title={programmeDetails.designation || "Promotion"}
          desc="Point d'entree du metier Charge de l'enseignement."
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
      </div>
    </div>
  );
}
