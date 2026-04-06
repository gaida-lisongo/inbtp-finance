import { notFound, redirect } from "next/navigation";

import FacultyCategoryWorkspace from "@/components/education/faculty-dashboard/FacultyCategoryWorkspace";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { getFacultyDashboardSnapshot } from "@/lib/utils/supabase/faculte-dashboard";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

const ALLOWED_CATEGORIES = new Set(["stages", "sujets", "laboratoire", "session", "documents", "releve", "validation"]);

type FacultyCategoryPageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ programme?: string }>;
};

export default async function FacultyCategoryPage({ params, searchParams }: FacultyCategoryPageProps) {
  const user = await getAuthenticatedUser();

  if (!user || user.activePersona !== "admin" || !user.agentId) {
    redirect("/signin?error=access_denied");
  }

  const codes = await getActiveAutorisationCodesForAgent(user.agentId);

  if (!codes.includes("CS")) {
    redirect("/signin?error=access_denied");
  }

  const { category } = await params;
  const { programme } = await searchParams;

  if (!ALLOWED_CATEGORIES.has(category)) {
    notFound();
  }

  const snapshot = await getFacultyDashboardSnapshot();
  const programmeId = typeof programme === "string" && programme.length > 0 ? programme : null;
  const selectedProgramme = programmeId ? snapshot.programmes.find((item) => item.id === programmeId) ?? null : null;

  const rows = snapshot.commandes.filter((row) => {
    if (row.categoryKey !== category) {
      return false;
    }

    if (!programmeId) {
      return true;
    }

    return row.programmeId === programmeId;
  });

  return (
    <FacultyCategoryWorkspace
      categoryKey={category}
      categoryLabel={rows[0]?.categoryLabel ?? category}
      rows={rows}
      rangeLabel={snapshot.dateWindow.label}
      programmeLabel={selectedProgramme?.designation ?? null}
    />
  );
}
