"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

import ComponentCard from "@/components/common/ComponentCard";
import type { FacultyDashboardSnapshot } from "@/lib/utils/supabase/faculte-dashboard";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type PerformanceChartProps = {
  series: FacultyDashboardSnapshot["monthlySeries"];
  rangeLabel: string | null;
};

export default function PerformanceChart({ series, rangeLabel }: PerformanceChartProps) {
  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      toolbar: { show: false },
    },
    colors: ["#16a34a", "#f59e0b"],
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.24,
        opacityTo: 0.04,
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit, sans-serif",
    },
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: series.map((item) => item.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (value) => `${Math.round(Number(value))}`,
      },
    },
    tooltip: {
      y: {
        formatter: (value) => `${value} commande(s)`,
      },
    },
  };

  const chartSeries = [
    {
      name: "Success",
      data: series.map((item) => item.success),
    },
    {
      name: "Pending",
      data: series.map((item) => item.pending),
    },
  ];

  return (
    <ComponentCard
      title="Performance mensuelle"
      desc={rangeLabel ? `Suivi des commandes success et pending sur la fenêtre ${rangeLabel}.` : "Définis les dates de l'année active pour voir la courbe."}
      className="h-full"
    >
      {series.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Aucune donnée mensuelle disponible pour la période active.
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[780px] xl:min-w-full">
            <ReactApexChart options={options} series={chartSeries} type="area" height={320} />
          </div>
        </div>
      )}
    </ComponentCard>
  );
}
