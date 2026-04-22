import { redirect } from "next/navigation";
import type { Metadata } from "next";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import JuryProgrammeList from "@/components/jury/JuryProgrammeList";
import PromotionDeliberationTable from "@/components/jury/PromotionDeliberationTable";
import { getAnnees } from "@/lib/utils/supabase/annees";
import { getJuriesForAgent, getNotesForProgramme } from "@/lib/utils/supabase/jury";
import { getProgrammeById, getProgrammes } from "@/lib/utils/supabase/programmes";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { NoteManager } from "@/utils/excel/NoteManager";

export const metadata: Metadata = {
  title: "Jury | Dashboard Agents",
  description: "Page metier dediee a l'autorisation Jury.",
};

type JuryPageProps = {
  searchParams: Promise<{
    annee?: string;
    promotion?: string;
  }>;
};

export default async function JuryPage({ searchParams }: JuryPageProps) {
  const [user, queryParams] = await Promise.all([getAuthenticatedUser(), searchParams]);

  if (!user || !user.canAccessAdmin || !user.agentId) {
    redirect("/signin?error=access_denied");
  }

  const anneeId = queryParams.annee;
  const promotionId = queryParams.promotion;

  if (!anneeId || !promotionId) {
    redirect("/");
  }

  const [annees, programme, programmes, juries] = await Promise.all([
    getAnnees(),
    getProgrammeById(promotionId),
    getProgrammes(),
    getJuriesForAgent(user.agentId),
  ]);

  if (juries.length === 0) {
    redirect("/signin?error=access_denied");
  }

  const annee = annees.find((item) => item.id === anneeId) ?? null;
  const programmeDetails: Awaited<ReturnType<typeof getProgrammes>>[number] | null =
    programmes.find((item) => item.id === promotionId && item.annee_id === anneeId) ?? null;
  const jury = juries.find((item) => item.isActivate === true) ?? juries[0] ?? null;

  if (!annee || !programme || !programmeDetails || programme.annee_id !== anneeId) {
    redirect("/");
  }

  if (!jury) {
    redirect("/jury?error=promotion_sans_jury");
  }

  if (jury.isActivate !== true) {
    redirect("/jury?error=jury_inactif");
  }

  const notes = await getNotesForProgramme(promotionId);
  const results = NoteManager.classerParPourcentage(NoteManager.calculerResultatsPromotion(notes));

  return (
    <div>
      <PageBreadcrumb 
        pageRoot={"Dashboard"}
        path={"/"}
        detailPage={`Jury | ${programme.designation ?? "Promotion"}`}
        pageTitle={"Promotion"} 
      />

      <div className="space-y-6">
        <ComponentCard
          title={programme.designation || "Promotion"}
          desc="Espace jury pour generer les grilles, le palmares et conduire la deliberation."
        >
          <div className="grid gap-4 sm:grid-cols-3">
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
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Jury actif</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {jury.designation || "Non renseigne"}
              </p>
            </div>
          </div>
        </ComponentCard>

        <JuryProgrammeList
          jury={jury}
          showOpenLink={false}
          programmes={[
            {
              id: programme.id,
              designation: programme.designation,
              description: programme.description,
              annee_id: programme.annee_id,
            },
          ]}
        />

        <PromotionDeliberationTable
          juryId={jury.id}
          promotionId={promotionId}
          results={results.map((item) => ({
            studentId: item.studentId,
            studentName: item.studentName,
            reference: item.matricule,
            pourcentage: item.promotion.pourcentage,
            mention: item.promotion.mention,
            ncv: item.promotion.ncv,
            ncnv: item.promotion.ncnv,
          }))}
        />
      </div>
    </div>
  );
}
