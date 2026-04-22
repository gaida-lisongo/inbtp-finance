import { redirect } from "next/navigation";
import type { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProgrammesManagementPanel from "@/components/programmes/ProgrammesManagementPanel";
import { getAnnees } from "@/lib/utils/supabase/annees";
import { getFilieres } from "@/lib/utils/supabase/filieres";
import { getProgrammeById, getProgrammes } from "@/lib/utils/supabase/programmes";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export const metadata: Metadata = {
  title: "Programmes | Dashboard Agents",
  description: "Gestion des programmes par les organisateurs",
};

type ProgrammesPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
    edit?: string;
    mode?: string;
  }>;
};

export default async function ProgrammesPage({ searchParams }: ProgrammesPageProps) {
  const [user, params] = await Promise.all([getAuthenticatedUser(), searchParams]);

  if (!user || !user.canManageProgramme) {
    redirect("/signin?error=access_denied");
  }

  const [programmes, filieres, annees] = await Promise.all([getProgrammes(), getFilieres(), getAnnees()]);
  const editingProgramme = params.edit ? await getProgrammeById(params.edit) : null;
  const feedbackMessage =
    params.message === "programme_team_owner_missing"
      ? "Le compte agent courant doit avoir un entra_id pour devenir proprietaire de l'equipe Teams."
      : params.message === "graph_team_owner_required"
        ? "Un proprietaire Entra est requis pour creer l'equipe Teams de la promotion."
        : params.message === "Authorization_RequestDenied"
          ? "Permissions Microsoft Graph insuffisantes pour creer l'equipe Teams. Verifiez les permissions application et le consentement admin."
          : params.message;

  return (
    <div>
      <PageBreadcrumb
        pageRoot="Dashboard"
        path="/"
        detailPage={`Gestion des Programmes`}
        pageTitle={`Gestion des Programmes`}
      />
      <ProgrammesManagementPanel
        programmes={programmes}
        filieres={filieres}
        annees={annees}
        editingProgramme={editingProgramme}
        mode={params.mode}
        status={params.status}
        message={feedbackMessage}
      />
    </div>
  );
}
