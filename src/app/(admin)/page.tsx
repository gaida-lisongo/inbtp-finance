"use client";

import { useState } from "react";
import { CommandeMetrics } from "@/components/education/CommandeMetrics";
import { WhiteListFilter } from "@/components/education/WhiteListFilter";
import { CommandeDistributionChart } from "@/components/education/CommandeDistributionChart";
import { ProductCarousel } from "@/components/education/ProductCarousel";
import { CommandeDetailModal } from "@/components/education/CommandeDetailModal";
import type { DashboardFilterState, MetierCategorie } from "@/types/education";

export default function EducationDashboard() {
  const [filterState, setFilterState] = useState<DashboardFilterState>({
    selectedAnneeId: null,
    selectedProgrammeId: null,
  });
  const [selectedCategory, setSelectedCategory] = useState<MetierCategorie | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Tableau de Bord
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Gestion centralisée des commandes par catégorie académique
        </p>
      </div>

      {/* Row 1: Filter and Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <WhiteListFilter onFilterChange={setFilterState} />
        </div>
        <div className="lg:col-span-2">
          <CommandeMetrics
            programmeId={filterState.selectedProgrammeId || undefined}
            anneeId={filterState.selectedAnneeId || undefined}
          />
        </div>
      </div>

      {/* Row 2: Distribution Chart */}
      <div className="col-span-12">
        <CommandeDistributionChart />
      </div>

      {/* Row 3: Product Carousel */}
      <ProductCarousel
        filterState={filterState}
        onSelectProduct={(categorie) => {
          setSelectedCategory(categorie as MetierCategorie);
          setIsDetailModalOpen(true);
        }}
      />

      {/* Detail Modal */}
      <CommandeDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        categorie={selectedCategory || undefined}
      />
    </div>
  );
}
