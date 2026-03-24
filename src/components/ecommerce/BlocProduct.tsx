"use client";

import { useRef } from "react";

import { BoxCubeIcon } from "@/icons";
import { ChevronLeftIcon, ChevronUpIcon } from "@/icons";
import type { DashboardFraisItem } from "./ListeWhatchlist";

export type DashboardModaliteItem = {
  id: number;
  designation: string;
  slug: string;
  montant: number | null;
  description: string;
  status: string;
  fraisId: string;
  groupeId: string | null;
  collectedAmount: number;
  pendingAmount: number;
  paymentsCount: number;
  successCount: number;
};

type BlocProductProps = {
  frais: DashboardFraisItem | null;
  modalites: DashboardModaliteItem[];
};

const formatCurrency = (value: number | null) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value ?? 0);

export default function BlocProduct({ frais, modalites }: BlocProductProps) {
  const railRef = useRef<HTMLDivElement>(null);

  if (!frais) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Aucun frais n&apos;est disponible pour afficher les modalites.
      </div>
    );
  }

  const scrollRail = (direction: "left" | "right") => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    rail.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:py-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Modalites de paiement
            </h3>
            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              {frais.designation} · {frais.promotionLabel}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 px-4 py-3 text-right dark:bg-gray-900/60">
            <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Montant cible
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
              {formatCurrency(frais.montant)}
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollRail("left")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
            aria-label="Defiler les modalites vers la gauche"
            title="Precedent"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail("right")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
            aria-label="Defiler les modalites vers la droite"
            title="Suivant"
          >
            <ChevronUpIcon className="size-5 rotate-90" />
          </button>
        </div>

        <div
          ref={railRef}
          className="custom-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-2"
        >
          {modalites.map((modalite) => (
            <article
              key={modalite.id}
              className="min-w-[320px] max-w-[320px] rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm transition hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-brand-500/30"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                  <BoxCubeIcon className="size-6 text-brand-600 dark:text-brand-300" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-semibold text-gray-800 dark:text-white/90">
                        {modalite.designation}
                      </h4>
                      <p className="mt-1 truncate text-theme-xs text-gray-500 dark:text-gray-400">
                        {modalite.slug}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                      {formatCurrency(modalite.montant)}
                    </span>
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                      Total des paiements cumules
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
                      {formatCurrency(modalite.collectedAmount)}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {modalites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Aucune modalite n&apos;est configuree pour ce frais sur l&apos;annee selectionnee.
          </div>
        ) : null}
      </div>
    </>
  );
}
