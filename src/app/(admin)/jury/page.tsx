import { redirect } from "next/navigation";
import type { Metadata } from "next";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getAllJuries, getJuriesByYear, getJuriesForAgent, getProgrammesByYear } from "@/lib/utils/supabase/jury";
import { getActiveAnnee } from "@/lib/utils/supabase/annees";
import JuryPromotionCard from "@/components/jury/JuryPromotionCard";
import type { ProgrammeRecord } from "@/lib/utils/supabase/programmes";
import JuryClientWrapper from "./JuryClientWrapper";

export const metadata: Metadata = {
  title: "Jury",
  description: "Accès jury : configuration (organisateur) ou délibération (enseignant).",
};

export default async function JuryAssignmentsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/signin?error=access_denied");
  }

  if (user.role === "titulaire" && user.canManageCharges && user.agentId) {
    const juries = await getJuriesForAgent(user.agentId);
    type JuryWithProgrammes = Awaited<ReturnType<typeof getJuriesForAgent>>[number] & { programmes: ProgrammeRecord[] };
    const juriesWithProgrammes: JuryWithProgrammes[] = await Promise.all(
      juries.map(async (jury) => ({
        ...jury,
        programmes: jury.annee_id ? await getProgrammesByYear(jury.annee_id) : [],
      })),
    );

    return (
      <div className="space-y-6">
        
      <PageBreadcrumb 
        pageRoot={"Dashboard"}
        path={"/"}
        detailPage={`Gestion du Jury`}
        pageTitle={"Jury"} 
      />


        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {juriesWithProgrammes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 px-6 py-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucun jury n’est associé à votre compte pour le moment.</p>
            </div>
          ) : (
            juriesWithProgrammes.map((jury) => (
              <JuryPromotionCard
                key={jury.id}
                jury={{
                  id: jury.id,
                  designation: jury.designation,
                  annee: jury.annee,
                  isActivate: jury.isActivate,
                  president: jury.president,
                  secretaire: jury.secretaire,
                }}
                programmes={jury.programmes.map((programme) => ({
                  id: programme.id,
                  designation: programme.designation,
                  description: programme.description,
                  annee_id: programme.annee_id,
                }))}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  if (!user.canManageYears || user.role !== "organisateur") {
    redirect("/signin?error=access_denied");
  }

  const annee = await getActiveAnnee();
  if (!annee) {
    redirect("/annees?error=annee_inactive");
  }

  const juries = await getAllJuries();

  return (
    <div className="space-y-6">
      <PageBreadcrumb 
        pageRoot={"Dashboard"}
        path={"/"}
        detailPage={`Gestion du Jury`}
        pageTitle={"Jury"} 
      />

      <JuryClientWrapper juries={juries} anneeId={annee.id} />
    </div>
  );
}
