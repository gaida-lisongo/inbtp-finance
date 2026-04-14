import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getProgrammeById } from "@/lib/utils/supabase/programmes";
import { getJuriesForAgent } from "@/lib/utils/supabase/jury";

export const metadata: Metadata = {
  title: "Jury | Délibération promotion",
  description: "Liste des étudiants et classement selon les notes obtenues.",
};

type JuryPromotionPageProps = {
  params: Promise<{ promotionId?: string }>;
  searchParams?: Promise<{ q?: string }>;
};

export default async function JuryPromotionPage({ params }: JuryPromotionPageProps) {
  const user = await getAuthenticatedUser();
  if (!user || !user.canManageCharges || !user.agentId || user.role !== "titulaire") {
    redirect("/signin?error=access_denied");
  }

  const promotionId = (await params).promotionId;
  if (!promotionId) {
    redirect("/jury");
  }

  const programme = await getProgrammeById(promotionId);
  if (!programme) {
    redirect("/jury");
  }

  const juries = await getJuriesForAgent(user.agentId);
  const matching = programme.annee_id ? juries.filter((jury) => jury.annee_id === programme.annee_id) : juries;

  const jury = matching[0] ?? null;
  if (!jury) {
    redirect("/jury?error=promotion_sans_jury");
  }

  redirect(`/jury/${jury.id}/promotion/${promotionId}`);
}

