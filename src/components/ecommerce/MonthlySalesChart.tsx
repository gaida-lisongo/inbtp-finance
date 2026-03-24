"use client";

import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export type DashboardYearOption = {
  id: string;
  label: string;
  subtitle: string;
};

type MonthlySalesChartProps = {
  yearOptions: DashboardYearOption[];
  selectedYearId: string;
  selectedYearLabel: string;
  monthlyAmounts: number[];
  totalCollectedAmount: number;
  transactionCount: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export default function MonthlySalesChart({
  yearOptions,
  selectedYearId,
  selectedYearLabel,
  monthlyAmounts,
  totalCollectedAmount,
  transactionCount,
}: MonthlySalesChartProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 260,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "42%",
        borderRadius: 8,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 5,
      colors: ["transparent"],
    },
    xaxis: {
      categories: ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        formatter: (value: number) => `${Math.round(value)}`,
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      x: {
        show: true,
      },
      y: {
        formatter: (value: number) => formatCurrency(value),
      },
    },
  };

  const handleYearChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("annee", value);
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Transactions percues
          </h3>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Repartition mensuelle des encaissements confirms pour {selectedYearLabel}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 px-4 py-2 text-right dark:bg-brand-500/10">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-300">
              Total percu
            </p>
            <p className="text-sm font-semibold text-brand-700 dark:text-white/90">
              {formatCurrency(totalCollectedAmount)}
            </p>
          </div>

          <select
            value={selectedYearId}
            onChange={(event) => handleYearChange(event.target.value)}
            className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          >
            {yearOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="inline-flex rounded-full bg-success-50 px-3 py-1 font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
          {transactionCount} transactions
        </span>
        {yearOptions.find((option) => option.id === selectedYearId)?.subtitle ? (
          <span>{yearOptions.find((option) => option.id === selectedYearId)?.subtitle}</span>
        ) : null}
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[720px] xl:min-w-full pl-2">
          <ReactApexChart
            options={options}
            series={[
              {
                name: "Montant percu",
                data: monthlyAmounts,
              },
            ]}
            type="bar"
            height={260}
          />
        </div>
      </div>
    </div>
  );
}
