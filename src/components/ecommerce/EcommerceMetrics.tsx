"use client";

import React from "react";

import Badge from "../ui/badge/Badge";
import { BoxIconLine, DollarLineIcon, TimeIcon } from "@/icons";

type EcommerceMetricsProps = {
  selectedAnneeLabel: string;
  collectedAmount: number;
  collectedCount: number;
  pendingAmount: number;
  pendingCount: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export const EcommerceMetrics = ({
  selectedAnneeLabel,
  collectedAmount,
  collectedCount,
  pendingAmount,
  pendingCount,
}: EcommerceMetricsProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-50 dark:bg-success-500/10">
          <DollarLineIcon className="size-6 text-success-600 dark:text-success-400" />
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Paiements collectes
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {formatCurrency(collectedAmount)}
            </h4>
            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              Encaissements valides sur {selectedAnneeLabel}
            </p>
          </div>
          <Badge color="success">{collectedCount} transactions</Badge>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-50 dark:bg-warning-500/10">
          <TimeIcon className="size-6 text-warning-600 dark:text-warning-400" />
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Paiements en attente
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {formatCurrency(pendingAmount)}
            </h4>
            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              Transactions a confirmer sur {selectedAnneeLabel}
            </p>
          </div>

          <Badge color="warning">
            <BoxIconLine className="size-4" />
            {pendingCount} en attente
          </Badge>
        </div>
      </div>
    </div>
  );
};
