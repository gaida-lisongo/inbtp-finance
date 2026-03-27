import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getAnnees } from "@/lib/utils/supabase/annees";
import { getProgrammes } from "@/lib/utils/supabase/programmes";
import { getRetraitById } from "@/lib/utils/supabase/retraits";

export const metadata: Metadata = {
  title: "Detail Retrait | Dashboard Agents",
  description: "Consultation d'un retrait et point d'entree pour sa validation.",
};

type RetraitDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const amountFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeStyle: "short",
});

export default async function RetraitDetailPage({ params }: RetraitDetailPageProps) {
  const { id } = await params;
  const [retrait, programmes, annees] = await Promise.all([getRetraitById(id), getProgrammes(), getAnnees()]);

  if (!retrait) {
    notFound();
  }

  const programme = programmes.find((item) => item.id === retrait.pgrogramme_id) ?? null;
  const annee = annees.find((item) => item.id === retrait.annee_id) ?? null;

  return (
    <div>
      <PageBreadcrumb pageTitle={`Retrait - ${retrait.designation || retrait.id}`} />

      <div className="space-y-6">
        <ComponentCard
          title={retrait.designation || "Retrait"}
          desc="Cette page est protegee par authentification. Elle sert de point d'entree pour la consultation et les prochaines etapes de traitement du retrait."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Statut</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">{retrait.status || "Brouillon"}</p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Montant</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {amountFormatter.format(retrait.montant ?? 0)}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Order number</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {retrait.orderNumber || "Non encore attribue"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Promotion</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {programme?.designation || "Promotion non trouvee"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Annee</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {annee?.designation || "Annee non trouvee"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Cree le</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {dateFormatter.format(new Date(retrait.created_at))}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03] sm:col-span-2 xl:col-span-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {retrait.description || "Aucune description"}
              </p>
            </div>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
