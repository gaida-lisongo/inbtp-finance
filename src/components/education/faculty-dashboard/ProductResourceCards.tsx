"use client";

import { useRef } from "react";

import Button from "@/components/ui/button/Button";
import type { FacultyDashboardCategory } from "@/lib/utils/supabase/faculte-dashboard";

import { CATEGORY_STYLES, formatAmount } from "./utils";

type ProductResourceCardsProps = {
  title: string;
  categories: FacultyDashboardCategory[];
  onOpenDetails: (category: FacultyDashboardCategory) => void;
  onPrintReport: (category: FacultyDashboardCategory) => void;
};

export default function ProductResourceCards({
  title,
  categories,
  onOpenDetails,
  onPrintReport,
}: ProductResourceCardsProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const categoryOrder = ["stages", "sujets", "laboratoire", "session", "releve", "validation"];

  const orderedCategories = categoryOrder.map((key) => {
    const category = categories.find((item) => item.key === key);

    return (
      category ?? {
        key,
        label: key.toUpperCase(),
        total: 0,
        success: 0,
        pending: 0,
        revenue: 0,
      }
    );
  });

  const scroll = (direction: "left" | "right") => {
    if (!sliderRef.current) {
      return;
    }

    const amount = sliderRef.current.clientWidth * 0.9;
    sliderRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Produits académiques</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ressources de la promotion active: {title}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
            aria-label="Faire défiler à gauche"
          >
            <span className="text-lg leading-none">‹</span>
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
            aria-label="Faire défiler à droite"
          >
            <span className="text-lg leading-none">›</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden px-6 py-6">
        <div ref={sliderRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth">
          {orderedCategories.map((category) => {
            const style = CATEGORY_STYLES[category.key] ?? CATEGORY_STYLES.autres;

            return (
              <article
                key={category.key}
                className={`w-[calc((100%-16px)/2)] shrink-0 snap-start rounded-3xl border border-gray-200 bg-white p-4 ring-1 ${style.ring} dark:border-gray-800 dark:bg-white/[0.03] lg:w-[calc((100%-32px)/3)] xl:w-[calc((100%-48px)/4)]`}
              >
                <div className={`h-1.5 w-20 rounded-full bg-gradient-to-r ${style.accent}`} />
                <div className="mt-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${style.badge}`}>
                    {category.label.toUpperCase()}
                  </span>
                  <h3 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{category.total}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">commandes pour cette ressource</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-2xl bg-gray-50 px-3 py-2.5 dark:bg-white/5">
                    <p className="text-gray-500 dark:text-gray-400">Success</p>
                    <p className="mt-1.5 font-semibold text-gray-900 dark:text-white">{category.success}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-3 py-2.5 dark:bg-white/5">
                    <p className="text-gray-500 dark:text-gray-400">Pending</p>
                    <p className="mt-1.5 font-semibold text-gray-900 dark:text-white">{category.pending}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-3 py-2.5 dark:bg-white/5">
                    <p className="text-gray-500 dark:text-gray-400">Montant</p>
                    <p className="mt-1.5 font-semibold text-gray-900 dark:text-white">{formatAmount(category.revenue)}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => onOpenDetails(category)}>
                    Détails
                  </Button>
                  <Button className="flex-1" onClick={() => onPrintReport(category)}>
                    Reporting PDF
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
