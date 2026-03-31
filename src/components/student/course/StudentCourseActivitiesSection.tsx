"use client";

import Link from "next/link";

import {
  categoryLabelMap,
  formatAmount,
  type StudentCourseOverviewData,
} from "@/components/student/course/course-overview-shared";

type StudentCourseActivitiesSectionProps = {
  activities: StudentCourseOverviewData["activities"];
  onSelectActivity: (activityId: string) => void;
};

export default function StudentCourseActivitiesSection({
  activities,
  onSelectActivity,
}: StudentCourseActivitiesSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.2em] text-brand-500">Priorité étudiante</div>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">Activités disponibles</h2>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{activities.length} activité(s)</div>
      </div>

      {activities.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {activities.map((activity) => (
            <article
              key={activity.id}
              className="overflow-hidden border border-gray-200 bg-white shadow-theme-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="bg-linear-to-r from-slate-950 via-slate-800 to-brand-600 px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
                    {categoryLabelMap[activity.category]}
                  </span>
                  <span className="text-sm font-semibold text-white">{formatAmount(activity.montant)}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{activity.designation || "Activité"}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/80">
                  {activity.description || "Activité pédagogique rattachée à ce cours."}
                </p>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {activity.existingSuccessCommande ? "Déjà payée" : "Commande requise"}
                  </span>
                  {activity.date_limite ? (
                    <span className="text-gray-500 dark:text-gray-400">Limite: {activity.date_limite}</span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {typeof activity.note === "number" ? `Note maximale: ${activity.note}` : "Accès individuel sécurisé"}
                  </div>
                  {activity.existingSuccessCommande ? (
                    <Link
                      href={activity.activityPath}
                      className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                    >
                      Accéder
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectActivity(activity.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
                    >
                      Commander
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-gray-300 bg-white px-5 py-10 text-sm text-gray-500 shadow-theme-sm dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400">
          Aucune activité n&apos;est encore rattachée à ce cours.
        </div>
      )}
    </section>
  );
}
