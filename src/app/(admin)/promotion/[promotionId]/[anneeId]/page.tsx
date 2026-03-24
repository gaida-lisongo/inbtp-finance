import { cookies } from "next/headers";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

import ModalitesCards, {
  type FraisOption,
  type ModaliteRecord,
} from "@/components/promotion/ModalitesCards";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

type PromotionDetailsPageProps = {
  params: Promise<{
    promotionId: string;
    anneeId: string;
  }>;
};

export default async function PromotionDetailsPage({ params }: PromotionDetailsPageProps) {
  const { promotionId, anneeId } = await params;
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const [{ data: frais, error: fraisError }, { data: modalitesRaw, error: modalitesError }] =
    await Promise.all([
      supabase
        .from("frais")
        .select("id, designation")
        .eq("promotion_id", promotionId)
        .order("designation", { ascending: true }),
      supabase
        .from("modalites")
        .select("id, created_at, designation, slug, montant, description, status, annee_id, frais_id, groupe_id")
        .eq("annee_id", anneeId)
        .order("created_at", { ascending: false }),
    ]);

  if (fraisError) {
    throw new Error(fraisError.message);
  }

  if (modalitesError) {
    throw new Error(modalitesError.message);
  }

  const fraisOptions = (frais ?? []) as FraisOption[];
  const fraisIds = new Set(fraisOptions.map((item) => item.id));
  const modalites = ((modalitesRaw ?? []) as ModaliteRecord[]).filter((item) =>
    item.frais_id ? fraisIds.has(item.frais_id) : false,
  );

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Modalites de paiements" />

      <ModalitesCards
        promotionId={promotionId}
        anneeId={anneeId}
        fraisOptions={fraisOptions}
        modalites={modalites}
      />
    </div>
  );
}
