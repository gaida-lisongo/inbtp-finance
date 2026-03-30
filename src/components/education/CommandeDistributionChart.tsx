"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { MonthlyDistribution, MetierCategorie } from "@/types/education";
import { getAllMetiers, getMetierLabel } from "@/constants/metier";
import { getCommandeMonthlyDistribution } from "@/lib/utils/supabase/commandes-dashboard";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface CommandeDistributionChartProps {
  year?: number;
}

export function CommandeDistributionChart({ year }: CommandeDistributionChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<MetierCategorie>("session");
  const [data, setData] = useState<MonthlyDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = year || new Date().getFullYear();

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const distribution = await getCommandeMonthlyDistribution(
          currentYear,
          selectedCategory
        );
        setData(distribution);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des données"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [selectedCategory, currentYear]);

  const chartOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      foreColor: "#9CA3AF",
    },
    colors: ["#10B981", "#F97316"],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 2,
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    xaxis: {
      categories: data.map((d) => d.month),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: { text: "Nombre de commandes" },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    legend: { position: "top" as const, horizontalAlign: "right" as const },
    grid: { strokeDashArray: 3, xaxis: { lines: { show: false } } },
  };

  const chartSeries = [
    {
      name: "Réussies",
      data: data.map((d) => d.success),
    },
    {
      name: "En attente",
      data: data.map((d) => d.pending),
    },
  ];

  return (
    <div className="rounded-sm border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-dark">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            Distribution des Commandes
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Année: {currentYear}
          </p>
        </div>
      </div>

      {/* Category Dropdown */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Catégorie
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as MetierCategorie)}
          className="relative z-20 inline-flex appearance-none rounded border border-gray-200 bg-white py-2 px-4 pr-9 text-sm font-medium outline-none dark:border-gray-700 dark:bg-gray-dark dark:text-white"
        >
          {getAllMetiers().map((metier) => (
            <option key={metier} value={metier}>
              {getMetierLabel(metier)}
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-80 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/10 dark:text-red-200">
          {error}
        </div>
      ) : (
        <ApexChart
          options={chartOptions}
          series={chartSeries}
          type="bar"
          height={350}
        />
      )}
    </div>
  );
}
