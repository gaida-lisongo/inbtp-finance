"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

import ComponentCard from "@/components/common/ComponentCard";
import type { TeacherDashboardRevenueMonth } from "@/lib/utils/supabase/teacher-dashboard";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type TeacherRevenueChartProps = {
  months: TeacherDashboardRevenueMonth[];
  activeYearLabel: string;
};

export default function TeacherRevenueChart({ months, activeYearLabel }: TeacherRevenueChartProps) {
  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      toolbar: { show: false },
    },
    colors: ["#16a34a"],
    dataLabels: { enabled: false },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: "48%",
      },
    },
    xaxis: {
      categories: months.map((month) => month.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (value) => `${Math.round(Number(value))} USD`,
      },
    },
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      y: {
        formatter: (value) => `${value} USD`,
      },
    },
  };

  const series = [
    {
      name: "Recettes",
      data: months.map((month) => Math.round(month.revenue * 100) / 100),
    },
  ];

  return (
    <ComponentCard
      title="Recettes mensuelles"
      desc={`Recettes des commandes d'activites sur ${activeYearLabel}.`}
      className="h-full"
    >
      {months.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Aucune recette a afficher pour la periode.
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[760px] xl:min-w-full">
            <ReactApexChart options={options} series={series} type="bar" height={320} />
          </div>
        </div>
      )}
    </ComponentCard>
  );
}
