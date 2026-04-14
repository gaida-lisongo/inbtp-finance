import { redirect } from "next/navigation";
import type { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PromotionDeliberationTable from "@/components/jury/PromotionDeliberationTable";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getProgrammeById } from "@/lib/utils/supabase/programmes";
import { getJuryById, getNotesForProgramme } from "@/lib/utils/supabase/jury";
import { NoteManager } from "@/utils/excel/NoteManager";

export const metadata: Metadata = {
  title: "Jury | Délibération promotion",
  description: "Liste des étudiants et classement selon les notes obtenues.",
};

type JuryPromotionPageProps = {
  params: Promise<{ juryId?: string; promotionId?: string }>;
};

export default async function JuryPromotionPage({ params }: JuryPromotionPageProps) {
  const user = await getAuthenticatedUser();
  if (!user || !user.agentId || user.role !== "titulaire") {
    redirect("/signin?error=access_denied");
  }

  const { juryId, promotionId } = await params;
  if (!juryId || !promotionId) {
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

  if (jury.isActivate !== true) {
    redirect("/jury?error=jury_inactif");
  }

  const programme = await getProgrammeById(promotionId);
  if (!programme) {
    redirect(`/jury/${juryId}`);
  }

  if (jury.annee_id && programme.annee_id && jury.annee_id !== programme.annee_id) {
    redirect(`/jury/${juryId}?error=promotion_invalide`);
  }

  const notes = await getNotesForProgramme(promotionId);
  const results = NoteManager.classerParPourcentage(NoteManager.calculerResultatsPromotion(notes));

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={`Délibération - ${programme.designation ?? "Promotion"}`} />

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-gray-900 dark:text-white">
              {programme.designation ?? "Promotion"}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Jury: {jury.designation ?? "—"} · {jury.annee?.designation ?? "—"}
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Recherche étudiants, recherche cours et filtre semestre disponibles dans l’espace de délibération.
          </p>
        </div>
      </div>

      <PromotionDeliberationTable
        juryId={juryId}
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
  );
}

