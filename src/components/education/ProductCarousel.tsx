"use client";

import { useEffect, useState } from "react";
import type { ProductMetrics as IProductMetrics, DashboardFilterState } from "@/types/education";
import { getProductMetrics } from "@/lib/utils/supabase/commandes-dashboard";
import { METIER_CATEGORIES, getMetierLabel } from "@/constants/metier";

interface ProductCarouselProps {
  filterState: DashboardFilterState;
  onSelectProduct?: (categorie: string) => void;
}

export function ProductCarousel({
  filterState,
  onSelectProduct,
}: ProductCarouselProps) {
  const [products, setProducts] = useState<IProductMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        const metrics = await getProductMetrics(
          filterState.selectedProgrammeId || undefined,
          filterState.selectedAnneeId || undefined
        );
        setProducts(metrics);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des produits"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, [filterState]);

  const scroll = (direction: "left" | "right") => {
    const container = document.getElementById("products-carousel");
    if (!container) return;

    const scrollAmount = 300;
    const newPosition =
      direction === "left"
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;

    container.scrollTo({ left: newPosition, behavior: "smooth" });
    setScrollPosition(newPosition);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900 dark:text-white">
          Produits (Métiers)
        </h3>
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-40 w-60 flex-shrink-0 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/10 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Aucun produit disponible pour cette sélection
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-900 dark:text-white">
        Produits (Métiers)
      </h3>

      {/* Carousel Container */}
      <div className="relative">
        {/* Scroll Buttons */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg dark:bg-gray-700"
          aria-label="Scroll left"
        >
          <svg
            className="h-5 w-5 text-gray-700 dark:text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg dark:bg-gray-700"
          aria-label="Scroll right"
        >
          <svg
            className="h-5 w-5 text-gray-700 dark:text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Carousel Items */}
        <div
          id="products-carousel"
          className="flex gap-4 overflow-x-auto px-8 py-4 scroll-smooth"
          style={{ scrollBehavior: "smooth" }}
        >
          {products.map((product) => {
            const config = METIER_CATEGORIES[product.categorie];
            const successRate =
              product.total > 0
                ? Math.round((product.success / product.total) * 100)
                : 0;

            return (
              <button
                key={product.categorie}
                onClick={() => onSelectProduct?.(product.categorie)}
                className="relative h-40 min-w-fit flex-shrink-0 rounded-lg border border-gray-200 bg-white p-6 transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-dark"
              >
                {/* Category Color Indicator */}
                <div
                  className={`absolute top-0 left-0 h-1 w-full rounded-t-lg ${config.bgColor}`}
                />

                {/* Content */}
                <div className="flex h-full flex-col justify-between text-left">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {getMetierLabel(product.categorie)}
                    </p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      Total: {product.total}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-xs">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-green-600 dark:text-green-400">
                          {product.success}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        <span className="text-orange-600 dark:text-orange-400">
                          {product.pending}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {successRate}% réussi
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
