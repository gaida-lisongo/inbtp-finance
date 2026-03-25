import { cookies } from "next/headers";

import AdminShell from "@/components/layout/AdminShell";
import { getCurrentAuthProfile } from "@/lib/utils/supabase/auth";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

const PRESENTATION_MODE = true;

type SidebarAnnee = {
  id: string;
  designation: string | null;
};

type SidebarPromotion = {
  id: string;
  designation: string | null;
};

async function getSidebarData() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const [{ data: annees, error: anneesError }, { data: promotions, error: promotionsError }] =
    await Promise.all([
      supabase.from("annees").select("id, designation").order("debut", { ascending: false }),
      supabase.from("promotions").select("id, designation").order("designation", { ascending: true }),
    ]);

  if (anneesError) {
    throw new Error(anneesError.message);
  }

  if (promotionsError) {
    throw new Error(promotionsError.message);
  }

  return {
    annees: (annees ?? []) as SidebarAnnee[],
    promotions: (promotions ?? []) as SidebarPromotion[],
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!PRESENTATION_MODE) {
    await getCurrentAuthProfile();
  }

  const sidebarData = await getSidebarData();

  return <AdminShell sidebarData={sidebarData}>{children}</AdminShell>;
}
