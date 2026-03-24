import { cookies } from "next/headers";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

import FraisCards, { type FraisRecord } from "@/components/promotion/FraisCards";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

type PromotionFraisPageProps = {
  params: Promise<{
    promotionId: string;
  }>;
};

export default async function PromotionFraisPage({ params }: PromotionFraisPageProps) {
  const { promotionId } = await params;
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const [{ data: promotion, error: promotionError }, { data: frais, error: fraisError }] = await Promise.all([
    supabase.from("promotions").select("id, designation").eq("id", promotionId).single(),
    supabase
      .from("frais")
      .select("id, created_at, designation, description, montant, promotion_id")
      .eq("promotion_id", promotionId)
      .order("created_at", { ascending: false }),
  ]);

  if (promotionError) {
    throw new Error(promotionError.message);
  }

  if (fraisError) {
    throw new Error(fraisError.message);
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Frais" />

      <FraisCards
        promotionId={promotionId}
        promotionName={promotion.designation ?? "Promotion"}
        frais={(frais ?? []) as FraisRecord[]}
      />
    </div>
  );
}
