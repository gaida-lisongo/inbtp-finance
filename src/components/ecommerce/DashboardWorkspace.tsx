"use client";

import { useEffect, useState } from "react";

import BlocProduct, { type DashboardModaliteItem } from "./BlocProduct";
import { EcommerceMetrics } from "./EcommerceMetrics";
import ListeWhatchlist, { type DashboardFraisItem } from "./ListeWhatchlist";
import MonthlySalesChart, { type DashboardYearOption } from "./MonthlySalesChart";
import RecentOrders, { type DashboardPaymentRow } from "./RecentOrders";

type DashboardWorkspaceProps = {
  selectedAnneeLabel: string;
  collectedAmount: number;
  collectedCount: number;
  pendingAmount: number;
  pendingCount: number;
  yearOptions: DashboardYearOption[];
  selectedYearId: string;
  monthlyAmounts: number[];
  totalCollectedAmount: number;
  transactionCount: number;
  frais: DashboardFraisItem[];
  modalitesByFrais: Record<string, DashboardModaliteItem[]>;
  payments: DashboardPaymentRow[];
};

export default function DashboardWorkspace({
  selectedAnneeLabel,
  collectedAmount,
  collectedCount,
  pendingAmount,
  pendingCount,
  yearOptions,
  selectedYearId,
  monthlyAmounts,
  totalCollectedAmount,
  transactionCount,
  frais,
  modalitesByFrais,
  payments,
}: DashboardWorkspaceProps) {
  const [selectedFraisId, setSelectedFraisId] = useState<string | null>(frais[0]?.id ?? null);

  useEffect(() => {
    if (!selectedFraisId && frais[0]?.id) {
      setSelectedFraisId(frais[0].id);
      return;
    }

    if (selectedFraisId && !frais.some((item) => item.id === selectedFraisId)) {
      setSelectedFraisId(frais[0]?.id ?? null);
    }
  }, [frais, selectedFraisId]);

  const selectedFrais = frais.find((item) => item.id === selectedFraisId) ?? frais[0] ?? null;
  const selectedModalites = selectedFrais ? modalitesByFrais[selectedFrais.id] ?? [] : [];

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-8">
        <EcommerceMetrics
          selectedAnneeLabel={selectedAnneeLabel}
          collectedAmount={collectedAmount}
          collectedCount={collectedCount}
          pendingAmount={pendingAmount}
          pendingCount={pendingCount}
        />
        <MonthlySalesChart
          yearOptions={yearOptions}
          selectedYearId={selectedYearId}
          selectedYearLabel={selectedAnneeLabel}
          monthlyAmounts={monthlyAmounts}
          totalCollectedAmount={totalCollectedAmount}
          transactionCount={transactionCount}
        />
      </div>

      <div className="col-span-12 xl:col-span-4">
        <ListeWhatchlist
          frais={frais}
          selectedFraisId={selectedFrais?.id ?? null}
          onSelect={setSelectedFraisId}
        />
      </div>

      <div className="col-span-12">
        <BlocProduct frais={selectedFrais} modalites={selectedModalites} />
      </div>

      <div className="col-span-12">
        <RecentOrders payments={payments} />
      </div>
    </div>
  );
}
