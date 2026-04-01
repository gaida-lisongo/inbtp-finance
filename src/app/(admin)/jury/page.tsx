import { redirect } from "next/navigation";
import type { Metadata } from "next";

import JuryPromotionCard from "@/components/jury/JuryPromotionCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getJuriesForAgent, getProgrammesByYear } from "@/lib/utils/supabase/jury";
import type { ProgrammeRecord } from "@/lib/utils/supabase/programmes";

export const metadata: Metadata = {
  title: "Jury | Mes attributions",
  description: "Explorer les jurys dont vous êtes responsable.",
};

type JuryWithProgrammes = Awaited<
  ReturnType<typeof getJuriesForAgent>
>[number] & { programmes: ProgrammeRecord[] };

export default async function JuryAssignmentsPage() {
  const user = await getAuthenticatedUser();

  if (!user || !user.canManageCharges || !user.agentId || user.role !== "titulaire") {
    redirect("/signin?error=access_denied");
  }

  const juries = await getJuriesForAgent(user.agentId);
  const juriesWithProgrammes: JuryWithProgrammes[] = await Promise.all(
    juries.map(async (jury) => ({
      ...jury,
      programmes: jury.annee_id
        ? await getProgrammesByYear(jury.annee_id)
        : [],
    })),
  );

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Jury" />

      <div className="grid gap-6">
        {juriesWithProgrammes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 px-6 py-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aucun jury n’est associé à votre compte pour le moment.
            </p>
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
