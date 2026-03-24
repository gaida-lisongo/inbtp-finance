import { cookies } from "next/headers";
import { Metadata } from "next";

import AnneesDataTable, {
  type AnneeRecord,
} from "@/components/annees/AnneesDataTable";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

export const metadata: Metadata = {
  title: "Annees academiques | Gestion Finance Ecole",
  description: "Gestion des annees academiques",
};

async function getAnnees(): Promise<AnneeRecord[]> {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { data, error } = await supabase
    .from("annees")
    .select("id, created_at, designation, debut, fin, slug, status")
    .order("debut", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AnneeRecord[];
}

export default async function AnneesPage() {
  const annees = await getAnnees();

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Annees academiques" />

      <ComponentCard
        title="Table des annees academiques"
        desc="Consultez, creez, modifiez et supprimez les annees academiques depuis cette table."
      >
        <AnneesDataTable annees={annees} />
      </ComponentCard>
    </div>
  );
}
