"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  FacultyDashboardCategory,
  FacultyDashboardSnapshot as FacultyDashboardSnapshotData,
} from "@/lib/utils/supabase/faculte-dashboard";

import CategoryModal from "@/components/education/faculty-dashboard/CategoryModal";
import LatestTransactions from "@/components/education/faculty-dashboard/LatestTransactions";
import MetricTile from "@/components/education/faculty-dashboard/MetricTile";
import PerformanceChart from "@/components/education/faculty-dashboard/PerformanceChart";
import ProductResourceCards from "@/components/education/faculty-dashboard/ProductResourceCards";
import PromotionsList from "@/components/education/faculty-dashboard/PromotionsList";
import { formatAmount, printCategoryReport } from "@/components/education/faculty-dashboard/utils";

type FacultyDashboardSnapshotProps = {
  snapshot: FacultyDashboardSnapshotData;
};

export default function FacultyDashboardSnapshot({ snapshot }: FacultyDashboardSnapshotProps) {
  const { activeAnnee, commandes, dateWindow, latestTransactions, monthlySeries, programmes, summary } = snapshot;
  const [selectedCategory, setSelectedCategory] = useState<FacultyDashboardCategory | null>(null);
  const [transactionsCategoryFilter, setTransactionsCategoryFilter] = useState("all");
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(programmes[0]?.id ?? null);

  useEffect(() => {
    setSelectedProgrammeId(programmes[0]?.id ?? null);
  }, [programmes]);

  const selectedProgramme = useMemo(
    () => programmes.find((programme) => programme.id === selectedProgrammeId) ?? programmes[0] ?? null,
    [programmes, selectedProgrammeId],
  );

  const selectedProgrammeCommandes = useMemo(() => {
    if (!selectedProgramme?.id) {
      return [];
    }

    return commandes.filter((commande) => commande.programmeId === selectedProgramme.id);
  }, [commandes, selectedProgramme]);

  const selectedProgrammeCategories = useMemo(() => {
    const counts = new Map<string, FacultyDashboardCategory>();

    for (const commande of selectedProgrammeCommandes) {
      const existing = counts.get(commande.categoryKey) ?? {
        key: commande.categoryKey,
        label: commande.categoryLabel,
        total: 0,
        success: 0,
        pending: 0,
        revenue: 0,
      };

      existing.total += 1;
      existing.revenue += commande.total ?? 0;

      if (commande.status === "success") {
        existing.success += 1;
      }

      if (commande.status === "pending") {
        existing.pending += 1;
      }

      counts.set(commande.categoryKey, existing);
    }

    return Array.from(counts.values());
  }, [selectedProgrammeCommandes]);

  const categoryRows = useMemo(
    () => selectedProgrammeCommandes.filter((commande) => commande.categoryKey === selectedCategory?.key),
    [selectedProgrammeCommandes, selectedCategory],
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
          selectedProgrammeId={selectedProgramme?.id ?? null}
          onSelectProgramme={setSelectedProgrammeId}
        />
      </div>

      <div>
        <ProductResourceCards
          title={selectedProgramme?.designation || "Aucune promotion active"}
          categories={selectedProgrammeCategories}
          onOpenDetails={setSelectedCategory}
          onPrintReport={(category) => {
            const rows = selectedProgrammeCommandes.filter((commande) => commande.categoryKey === category.key);
            printCategoryReport(`${category.label} - ${selectedProgramme?.designation || "Promotion active"}`, rows);
          }}
        />
      </div>

      <LatestTransactions
        rows={
          selectedProgramme?.id
            ? latestTransactions.filter((commande) => commande.programmeId === selectedProgramme.id)
            : latestTransactions
        }
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
