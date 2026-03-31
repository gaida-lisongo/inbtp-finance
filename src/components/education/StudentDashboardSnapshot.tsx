"use client";

import { useEffect, useMemo, useState } from "react";

import type { FacultyDashboardCategory } from "@/lib/utils/supabase/faculte-dashboard";
import type { StudentDashboardSnapshot as StudentDashboardSnapshotData } from "@/lib/utils/supabase/student-dashboard";

import CategoryModal from "@/components/education/faculty-dashboard/CategoryModal";
import LatestTransactions from "@/components/education/faculty-dashboard/LatestTransactions";
import MetricTile from "@/components/education/faculty-dashboard/MetricTile";
import PerformanceChart from "@/components/education/faculty-dashboard/PerformanceChart";
import ProductResourceCards from "@/components/education/faculty-dashboard/ProductResourceCards";
import PromotionsList from "@/components/education/faculty-dashboard/PromotionsList";
import { printCategoryReport } from "@/components/education/faculty-dashboard/utils";

type StudentDashboardSnapshotProps = {
  snapshot: StudentDashboardSnapshotData;
};

export default function StudentDashboardSnapshot({ snapshot }: StudentDashboardSnapshotProps) {
  const { activeAnnee, commandes, dateWindow, latestTransactions, monthlySeries, programmes, summary } = snapshot;
  const [selectedCategory, setSelectedCategory] = useState<FacultyDashboardCategory | null>(null);
  const [transactionsCategoryFilter, setTransactionsCategoryFilter] = useState("all");
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(programmes[0]?.id ?? null);

  useEffect(() => {
    const defaultProgramme = programmes.find((programme) => programme.annee_id === activeAnnee?.id) ?? programmes[0] ?? null;
    setSelectedProgrammeId(defaultProgramme?.id ?? null);
  }, [activeAnnee?.id, programmes]);

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
          title="Parcours actifs"
          value={String(summary.activeParcoursCount)}
          helper={`${summary.parcoursCount} inscriptions rattachées à votre compte`}
          tone="green"
        />
        <MetricTile
          title="Commandes success"
          value={String(summary.successCount)}
          helper={`Vos ressources payées sur ${activeAnneeLabel.toLowerCase()}`}
          tone="blue"
        />
        <MetricTile
          title="Commandes pending"
          value={String(summary.pendingCount)}
          helper="Paiements encore en attente de validation"
          tone="amber"
        />
        <MetricTile
          title="Promotions"
          value={String(programmes.length)}
          helper="Vos inscriptions académiques"
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
            printCategoryReport(`${category.label} - ${selectedProgramme?.designation || "Promotion étudiante"}`, rows);
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
