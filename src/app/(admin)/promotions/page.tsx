import { cookies } from "next/headers";
import { Metadata } from "next";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PromotionsDataTable, {
  type PromotionRecord,
} from "@/components/promotions/PromotionsDataTable";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

export const metadata: Metadata = {
  title: "Promotions | Gestion Finance Ecole",
  description: "Gestion des promotions de l'etablissement",
};

async function getPromotions(): Promise<PromotionRecord[]> {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { data, error } = await supabase
    .from("promotions")
    .select("id, created_at, designation, slug, description")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PromotionRecord[];
}

export default async function PromotionsPage() {
  const promotions = await getPromotions();

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Promotions" />

      <ComponentCard
        title="Table des promotions"
        desc="Consultez, creez, modifiez et supprimez les promotions depuis cette table."
      >
        <PromotionsDataTable promotions={promotions} />
      </ComponentCard>
    </div>
  );
}
