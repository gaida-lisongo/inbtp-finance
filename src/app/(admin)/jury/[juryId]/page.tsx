import { redirect } from "next/navigation";
import type { Metadata } from "next";

import JuryProgrammeList from "@/components/jury/JuryProgrammeList";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getJuryById, getProgrammesByYear } from "@/lib/utils/supabase/jury";
import type { ProgrammeRecord } from "@/lib/utils/supabase/programmes";

export const metadata: Metadata = {
  title: "Jury | Promotions",
  description: "Explorer les promotions attribuées à ce jury.",
};

type JuryDetailPageProps = {
  params: Promise<{ juryId?: string }>;
};

export default async function JuryDetailPage({ params }: JuryDetailPageProps) {
  const user = await getAuthenticatedUser();
  if (!user || !user.canManageCharges || !user.agentId || user.role !== "titulaire") {
    redirect("/signin?error=access_denied");
  }

  const juryId = (await params).juryId;
  if (!juryId) {
    redirect("/jury");
  }

  const jury = await getJuryById(juryId);
  if (!jury) {
    redirect("/jury");
  }

  const isMember = jury.president_id === user.agentId || jury.secretaire_id === user.agentId;
  if (!isMember) {
    redirect("/signin?error=access_denied");
  }

  const programmes: ProgrammeRecord[] = jury.annee_id ? await getProgrammesByYear(jury.annee_id) : [];

  return (
    <div className="space-y-6">
       <PageBreadcrumb 
          pageRoot="Jury"
          path="/jury"
          detailPage={`Jury - ${jury.designation ?? "Détail"}`}
          pageTitle={`Jury - ${jury.designation ?? "Détail"}`} 
        />
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {jury.designation ?? "Jury sans nom"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {jury.annee?.designation ?? "Année académique non renseignée"}
            </p>
          </div>
          <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">Président :</span>
            <span>
              {[jury.president?.prenom, jury.president?.post_nom, jury.president?.nom].filter(Boolean).join(" ") || "NC"}
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">Secrétaire :</span>
            <span>
              {[jury.secretaire?.prenom, jury.secretaire?.post_nom, jury.secretaire?.nom].filter(Boolean).join(" ") || "NC"}
            </span>
          </div>
        </div>
      </div>

      <JuryProgrammeList jury={jury} programmes={programmes} />
    </div>
  );
}

