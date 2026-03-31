"use client";

import { useMemo, useState } from "react";

import Button from "@/components/ui/button/Button";
import ComponentCard from "@/components/common/ComponentCard";
import type {
  FacultyDashboardCategory,
  FacultyDashboardSnapshot as FacultyDashboardSnapshotData,
} from "@/lib/utils/supabase/faculte-dashboard";

import CategoryModal from "@/components/education/faculty-dashboard/CategoryModal";
import LatestTransactions from "@/components/education/faculty-dashboard/LatestTransactions";
import MetricTile from "@/components/education/faculty-dashboard/MetricTile";
import PerformanceChart from "@/components/education/faculty-dashboard/PerformanceChart";
import PromotionsList from "@/components/education/faculty-dashboard/PromotionsList";
import { CATEGORY_STYLES, formatAmount } from "@/components/education/faculty-dashboard/utils";

type FacultyDashboardSnapshotProps = {
  snapshot: FacultyDashboardSnapshotData;
};

export default function FacultyDashboardSnapshot({ snapshot }: FacultyDashboardSnapshotProps) {
  const { activeAnnee, categories, commandes, dateWindow, latestTransactions, monthlySeries, programmes, summary } = snapshot;
  const [selectedCategory, setSelectedCategory] = useState<FacultyDashboardCategory | null>(null);
  const [transactionsCategoryFilter, setTransactionsCategoryFilter] = useState("all");

  const categoryRows = useMemo(
    () => commandes.filter((commande) => commande.categoryKey === selectedCategory?.key),
    [commandes, selectedCategory],
  );
  const activeAnneeLabel = activeAnnee?.designation || "Aucune année active";
  const activeRangeLabel = dateWindow.label || "Période non renseignée";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          title="Commandes success"
          value={String(summary.successCount)}
          helper={`${formatAmount(summary.successRevenue)} encaissés sur l'année active`}
          tone="green"
        />
        <MetricTile
          title="Commandes pending"
          value={String(summary.pendingCount)}
          helper={`${formatAmount(summary.pendingRevenue)} en attente sur l'année active`}
          tone="amber"
        />
        <MetricTile
          title="Taux de conversion"
          value={`${summary.successRate}%`}
          helper={`${summary.totalCommandes} commandes observées entre début et fin d'année`}
          tone="blue"
        />
        <MetricTile
          title="Promotions actives"
          value={String(programmes.length)}
          helper={activeAnnee?.designation || "Aucune année active"}
          tone="slate"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.9fr)]">
        <PerformanceChart series={monthlySeries} rangeLabel={dateWindow.label} />
        <PromotionsList
          programmes={programmes}
          activeAnneeLabel={activeAnneeLabel}
          activeRangeLabel={activeRangeLabel}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.8fr)]">
        <ComponentCard
          title="Produits académiques"
          desc="Carousel des catégories de commandes pour la faculté, avec accès direct au reporting et au détail."
        >
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune catégorie de commande trouvée pour la période active.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {categories.map((category) => {
                const style = CATEGORY_STYLES[category.key] ?? CATEGORY_STYLES.autres;

                return (
                  <article
                    key={category.key}
                    className={`min-w-[280px] flex-1 rounded-3xl border border-gray-200 bg-white p-5 ring-1 ${style.ring} dark:border-gray-800 dark:bg-white/[0.03]`}
                  >
                    <div className={`h-1.5 w-20 rounded-full bg-gradient-to-r ${style.accent}`} />
                    <div className="mt-5 flex items-start justify-between gap-3">
                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${style.badge}`}>
                          {category.label}
                        </span>
                        <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">{category.total} commandes</h3>
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Académique</span>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-2xl bg-gray-50 px-3 py-3 dark:bg-white/5">
                        <p className="text-gray-500 dark:text-gray-400">Success</p>
                        <p className="mt-2 font-semibold text-gray-900 dark:text-white">{category.success}</p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 px-3 py-3 dark:bg-white/5">
                        <p className="text-gray-500 dark:text-gray-400">Pending</p>
                        <p className="mt-2 font-semibold text-gray-900 dark:text-white">{category.pending}</p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 px-3 py-3 dark:bg-white/5">
                        <p className="text-gray-500 dark:text-gray-400">Montant</p>
                        <p className="mt-2 font-semibold text-gray-900 dark:text-white">{formatAmount(category.revenue)}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setTransactionsCategoryFilter(category.key)}>
                        Reporting
                      </Button>
                      <Button className="flex-1" onClick={() => setSelectedCategory(category)}>
                        Voir détail
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </ComponentCard>

        <ComponentCard title="Contexte académique" desc="Cadre de calcul de tous les KPI affichés sur cette page." className="h-full">
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Année active</p>
              <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{activeAnnee?.designation || "Aucune année active"}</p>
              <p className="mt-1">{dateWindow.label || "Dates de début/fin non renseignées."}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Règle métier</p>
              <p className="mt-2">
                Les KPI utilisent les commandes dont `created_at` est compris entre `date_debut` et `date_fin` de l'année active.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Scope transactions</p>
              <p className="mt-2">Le bloc du bas travaille sur les 20 dernières transactions de cette période, paginées 5 par 5.</p>
            </div>
          </div>
        </ComponentCard>
      </div>

      <LatestTransactions
        rows={latestTransactions}
        categoryFilter={transactionsCategoryFilter}
        onCategoryFilterChange={setTransactionsCategoryFilter}
      />

      <CategoryModal
        category={selectedCategory}
        commandes={categoryRows}
        isOpen={selectedCategory !== null}
        onClose={() => setSelectedCategory(null)}
      />
    </div>
  );
}
