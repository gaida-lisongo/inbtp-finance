import { redirect } from "next/navigation";
import type { Metadata } from "next";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  autorisationLabels,
  getActiveAutorisationCodesForAgent,
  normalizeAutorisationCode,
} from "@/lib/utils/supabase/autorisations";
import { getProgrammeById, getProgrammes } from "@/lib/utils/supabase/programmes";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export const metadata: Metadata = {
  title: "Promotion | Dashboard Agents",
  description: "Vue d'une promotion accessible depuis une autorisation donnee.",
};

type PromotionPageProps = {
  params: Promise<{
    code: string;
    promotionId: string;
  }>;
};

export default async function PromotionPage({ params }: PromotionPageProps) {
  const [user, routeParams] = await Promise.all([getAuthenticatedUser(), params]);

  if (!user || !user.canAccessAdmin || !user.agentId) {
    redirect("/signin?error=access_denied");
  }

  const code = normalizeAutorisationCode(routeParams.code);

  if (!code) {
    redirect("/");
  }

  const [activeCodes, programme, programmes] = await Promise.all([
    getActiveAutorisationCodesForAgent(user.agentId),
    getProgrammeById(routeParams.promotionId),
    getProgrammes(),
  ]);

  if (!activeCodes.includes(code)) {
    redirect("/signin?error=access_denied");
  }

  const programmeDetails = programmes.find((item) => item.id === routeParams.promotionId) ?? null;

  if (!programme || !programmeDetails) {
    redirect("/");
  }

  return (
    <div>
      <PageBreadcrumb
        pageTitle={`${autorisationLabels[code]} - ${programmeDetails.designation || "Promotion"}`}
      />

      <div className="space-y-6">
        <ComponentCard
          title={programmeDetails.designation || "Promotion"}
          desc={`Promotion rattachee a l'autorisation ${autorisationLabels[code]}.`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Autorisation</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {autorisationLabels[code]}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Annee academique</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {programmeDetails.anneeDesignation || "Non renseignee"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Filiere</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {programmeDetails.filiereDesignation || "Non renseignee"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Groupe</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {programme.groupe_id || "Non renseigne"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Systeme</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {programme.systeme || "Non renseigne"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {programme.description || "Aucune description disponible."}
              </p>
            </div>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
