"use client";

import Link from "next/link";

import type { StudentDashboardResource } from "@/lib/utils/supabase/student-dashboard";

const formatAmount = (value: number | null) => {
  if (typeof value !== "number") {
    return "Montant non renseigné";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
};

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "success":
      return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300";
    case "pending":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300";
  }
};

type StudentResourceCatalogProps = {
  title: string;
  resources: StudentDashboardResource[];
  selectedCategoryLabel: string;
  onClear: () => void;
};

export default function StudentResourceCatalog({
  title,
  resources,
  selectedCategoryLabel,
  onClear,
}: StudentResourceCatalogProps) {
  console.log("Rendering StudentResourceCatalog with resources:", resources);
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-5">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
        >
          <span aria-hidden="true">←</span>
          <span>Retour au dashboard</span>
        </button>

        <div className="mt-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">Ressources disponibles</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{selectedCategoryLabel} publiées pour {title}.</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{resources.length} ressource(s) trouvée(s)</p>
        </div>
      </div>

      <div className="space-y-3">
        {resources.length > 0 ? (
          resources.map((resource) => {
            const hasPaidAccess = resource.latestOrder?.status === "success";

            return (
              <article
                key={`${resource.category}:${resource.id}`}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                      {resource.categoryLabel}
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white/90 sm:text-base">{resource.title}</h4>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {resource.programmeDesignation || "Programme non renseigné"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">Montant</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{formatAmount(resource.amount)}</div>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-5 text-gray-600 dark:text-gray-300">
                  {resource.description || "Cette ressource a été publiée par la faculté et peut être commandée depuis votre espace."}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {resource.documentCategory ? (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
                      {resource.documentCategory}
                    </span>
                  ) : null}
                  {resource.latestOrder ? (
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusBadge(resource.latestOrder.status)}`}>
                      {resource.latestOrder.status === "success"
                        ? "Validée"
                        : resource.latestOrder.status === "pending"
                          ? "En attente"
                          : "Initiée"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
                      Nouvelle
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Link
                    href={hasPaidAccess ? resource.productPath : resource.commandePath}
                    className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
                  >
                    {hasPaidAccess ? "Ouvrir" : "Commander"}
                  </Link>
                  <Link
                    href={`/paiement/${resource.category}/${resource.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                  >
                    Paiement
                  </Link>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Aucune ressource publiée dans cette catégorie pour la promotion sélectionnée.
          </div>
        )}
      </div>
    </section>
  );
}
