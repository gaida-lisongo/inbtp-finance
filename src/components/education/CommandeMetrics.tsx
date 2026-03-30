"use client";

import { useEffect, useState } from "react";
import type { CommandeMetrics as ICommandeMetrics, MetierCategorie } from "@/types/education";
import { getCommandeMetrics } from "@/lib/utils/supabase/commandes-dashboard";

interface CommandeMetricsProps {
  categorie?: MetierCategorie;
  programmeId?: string;
  anneeId?: string;
}

export function CommandeMetrics({
  categorie,
  programmeId,
  anneeId,
}: CommandeMetricsProps) {
  const [metrics, setMetrics] = useState<ICommandeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setIsLoading(true);
        const data = await getCommandeMetrics({
          categorie,
          programmeId,
          anneeId,
        });
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors du chargement des métriques"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadMetrics();
  }, [categorie, programmeId, anneeId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="animate-pulse rounded-sm bg-gray-200 p-6 dark:bg-gray-700" />
        <div className="animate-pulse rounded-sm bg-gray-200 p-6 dark:bg-gray-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/10 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const successPercentage =
    metrics.success + metrics.pending > 0
      ? Math.round((metrics.success / (metrics.success + metrics.pending)) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Success Card */}
      <div className="rounded-sm border border-green-200 bg-white px-6 py-7.5 dark:border-green-700 dark:bg-gray-dark">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Commandes Réussies
            </h4>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {metrics.success}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {successPercentage}%
              </span>
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <svg
              className="h-6 w-6 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Pending Card */}
      <div className="rounded-sm border border-orange-200 bg-white px-6 py-7.5 dark:border-orange-700 dark:bg-gray-dark">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Commandes en Attente
            </h4>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {metrics.pending}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {100 - successPercentage}%
              </span>
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
            <svg
              className="h-6 w-6 text-orange-600 dark:text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
