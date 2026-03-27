import { redirect } from "next/navigation";
import type { Metadata } from "next";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getProgrammeById, getProgrammes } from "@/lib/utils/supabase/programmes";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export const metadata: Metadata = {
  title: "Classe | Dashboard Agents",
  description: "Vue d'une classe basee sur un programme",
};

type ClassePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClassePage({ params }: ClassePageProps) {
  const [user, routeParams, programmes] = await Promise.all([getAuthenticatedUser(), params, getProgrammes()]);

  if (!user || !user.canAccessAdmin) {
    redirect("/signin?error=access_denied");
  }

  const programme = await getProgrammeById(routeParams.id);
  const programmeDetails = programmes.find((item) => item.id === routeParams.id) ?? null;

  if (!programme || !programmeDetails) {
    redirect("/");
  }

  return (
    <div>
      <PageBreadcrumb pageTitle={programmeDetails.designation || "Classe"} />

      <div className="space-y-6">
        <ComponentCard
          title={programmeDetails.designation || "Classe"}
          desc="Cette vue sert de point d'entree pour les ecrans lies a la classe/programme."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Filiere</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {programmeDetails.filiereDesignation || "Non renseignee"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Annee</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {programmeDetails.anneeDesignation || "Non renseignee"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Groupe</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {programme.groupe_id || "Non renseigne"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Systeme</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {programme.systeme || "Non renseigne"}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-white/[0.03] dark:text-gray-300">
            {programme.description || "Aucune description disponible pour cette classe."}
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
