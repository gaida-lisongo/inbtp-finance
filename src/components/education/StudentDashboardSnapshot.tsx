"use client";

import { useMemo, useState } from "react";

import type { FacultyDashboardCategory } from "@/lib/utils/supabase/faculte-dashboard";
import type { StudentDashboardSnapshot as StudentDashboardSnapshotData } from "@/lib/utils/supabase/student-dashboard";

import LatestTransactions from "@/components/education/faculty-dashboard/LatestTransactions";
import MetricTile from "@/components/education/faculty-dashboard/MetricTile";
import PerformanceChart from "@/components/education/faculty-dashboard/PerformanceChart";
import ProductResourceCards from "@/components/education/faculty-dashboard/ProductResourceCards";
import PromotionsList from "@/components/education/faculty-dashboard/PromotionsList";
import StudentResourceCatalog from "@/components/education/student-dashboard/StudentResourceCatalog";
import { printCategoryReport } from "@/components/education/faculty-dashboard/utils";

type StudentDashboardSnapshotProps = {
  snapshot: StudentDashboardSnapshotData;
};

export default function StudentDashboardSnapshot({ snapshot }: StudentDashboardSnapshotProps) {
  const { activeAnnee, availableResources, commandes, dateWindow, monthlySeries, programmes, summary } = snapshot;
  const [selectedCategory, setSelectedCategory] = useState<FacultyDashboardCategory | null>(null);
  const [transactionsCategoryFilter, setTransactionsCategoryFilter] = useState("all");
  const defaultProgrammeId =
    programmes.find((programme) => programme.annee_id === activeAnnee?.id)?.id ?? programmes[0]?.id ?? null;
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(defaultProgrammeId);

  const selectedProgramme = useMemo(
    () => programmes.find((programme) => programme.id === selectedProgrammeId) ?? programmes[0] ?? null,
    [programmes, selectedProgrammeId],
  );

  const selectedProgrammeAvailableResources = useMemo(() => {
    if (!selectedProgramme?.id) {
      return [];
    }

    return availableResources.filter((resource) => resource.programmeId === selectedProgramme.id);
  }, [availableResources, selectedProgramme]);

  const selectedProgrammeCategories = useMemo(() => {
    const counts = new Map<string, FacultyDashboardCategory>();

    for (const resource of selectedProgrammeAvailableResources) {
      const existing = counts.get(resource.categoryKey) ?? {
        key: resource.categoryKey,
        label: resource.categoryLabel,
        total: 0,
        success: 0,
        pending: 0,
        revenue: 0,
      };

      existing.total += 1;
      existing.revenue += resource.amount ?? 0;

      const latestStatus = (resource.latestOrder?.status ?? "").trim().toLowerCase();

      if (latestStatus === "success") {
        existing.success += 1;
      }

      if (latestStatus === "pending") {
        existing.pending += 1;
      }

      counts.set(resource.categoryKey, existing);
    }

    return Array.from(counts.values());
  }, [selectedProgrammeAvailableResources]);

  const selectedProgrammeResources = useMemo(() => {
    if (!selectedCategory?.key) {
      return [];
    }

    return availableResources.filter((resource) => {
      if (resource.categoryKey !== selectedCategory.key) {
        return false;
      }

      if (!selectedProgramme?.id) {
        return true;
      }

      return resource.programmeId === selectedProgramme.id;
    });
  }, [availableResources, selectedCategory, selectedProgramme]);

  const activeAnneeLabel = activeAnnee?.designation || "Aucune année active";
  const activeRangeLabel = dateWindow.label || "Période non renseignée";

  if (selectedCategory) {
    return (
      <StudentResourceCatalog
        title={selectedProgramme?.designation || "vos promotions"}
        resources={selectedProgrammeResources}
        selectedCategoryLabel={selectedCategory.label}
        onClear={() => setSelectedCategory(null)}
      />
    );
  }

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
            const rows = commandes.filter((commande) => commande.categoryKey === category.key);
            printCategoryReport(`${category.label} - Historique étudiant`, rows);
          }}
        />
      </div>

      <LatestTransactions
        title="Historique des commandes"
        description="Retrouvez ici l’historique complet de vos commandes et filtrez-le par catégorie ou statut."
        rows={commandes}
        categoryFilter={transactionsCategoryFilter}
        onCategoryFilterChange={setTransactionsCategoryFilter}
      />
    </div>
  );
}
