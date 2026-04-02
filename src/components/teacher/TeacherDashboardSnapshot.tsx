"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import LatestTransactions from "@/components/education/faculty-dashboard/LatestTransactions";
import MetricTile from "@/components/education/faculty-dashboard/MetricTile";
import type { TeacherDashboardActivityCard, TeacherDashboardSnapshot as TeacherDashboardSnapshotData } from "@/lib/utils/supabase/teacher-dashboard";

import TeacherRevenueChart from "./TeacherRevenueChart";

type TeacherDashboardSnapshotProps = {
  snapshot: TeacherDashboardSnapshotData;
};

const formatDateLabel = (value: string | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
};

const formatAmount = (value: number | null | undefined) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(typeof value === "number" ? value : 0);

const toCsv = (activity: TeacherDashboardActivityCard) => {
  const header = ["Date", "Etudiant", "Email", "Statut", "Note", "Montant (USD)", "Commentaire"];
  const rows = activity.commandes.map((commande) => [
    new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(commande.createdAt)),
    commande.studentName,
    commande.studentEmail ?? "",
    commande.status,
    typeof commande.note === "number" ? String(commande.note) : "",
    String(commande.montant),
    commande.comment ?? "",
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
};

const downloadActivityCsv = (activity: TeacherDashboardActivityCard) => {
  const csv = toCsv(activity);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = activity.designation.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || activity.id;

  link.href = url;
  link.setAttribute("download", `commandes-${safeName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function TeacherDashboardSnapshot({ snapshot }: TeacherDashboardSnapshotProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(snapshot.courses[0]?.id ?? null);
  const [transactionsCategoryFilter, setTransactionsCategoryFilter] = useState("all");
  const carouselRef = useRef<HTMLDivElement>(null);

  const selectedCourse = useMemo(
    () => snapshot.courses.find((course) => course.id === selectedCourseId) ?? snapshot.courses[0] ?? null,
    [selectedCourseId, snapshot.courses],
  );

  const courseActivities = useMemo(() => {
    if (!selectedCourse?.id) {
      return [];
    }

    return snapshot.activities.filter((activity) => activity.coursId === selectedCourse.id);
  }, [selectedCourse, snapshot.activities]);

  const activeYearLabel = snapshot.activeAnnee?.designation ?? "annee active";

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) {
      return;
    }

    const amount = carouselRef.current.clientWidth * 0.8;
    carouselRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          title="Annee active"
          value={snapshot.activeAnnee?.designation ?? "Non definie"}
          helper={`${snapshot.summary.coursesCount} cours sur la periode`}
          tone="slate"
        />
        <MetricTile
          title="Activites"
          value={String(snapshot.summary.activitiesCount)}
          helper="Activites rattachees a vos cours"
          tone="blue"
        />
        <MetricTile
          title="Commandes traitees"
          value={String(snapshot.summary.successCount)}
          helper={`${snapshot.summary.pendingCount} en attente`}
          tone="green"
        />
        <MetricTile
          title="Recettes"
          value={formatAmount(snapshot.summary.revenue)}
          helper="Somme des commandes success"
          tone="amber"
        />
      </div>

      <TeacherRevenueChart months={snapshot.monthlyRevenue} activeYearLabel={activeYearLabel} />

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">Cours de l&apos;annee active</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Le premier cours est selectionne par defaut et pilote le carrousel des activites.
        </p>

        {snapshot.courses.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 px-5 py-8 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
            Aucun cours enseigne sur l&apos;annee active.
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {snapshot.courses.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => setSelectedCourseId(course.id)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  selectedCourse?.id === course.id
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-300 text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
                }`}
              >
                {course.matiereDesignation ?? "Matiere"}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">Activites du cours selectionne</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Export CSV des commandes ou ouverture de la page d&apos;edition des notes pour chaque activite.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollCarousel("left")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
              aria-label="Defiler a gauche"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel("right")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
              aria-label="Defiler a droite"
            >
              ›
            </button>
          </div>
        </div>

        {courseActivities.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 px-5 py-8 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
            Aucune activite sur ce cours pour l&apos;annee active.
          </div>
        ) : (
          <div ref={carouselRef} className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1">
            {courseActivities.map((activity) => (
              <article
                key={activity.id}
                className="w-[320px] shrink-0 snap-start rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/[0.02]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-brand-500">{activity.categoryLabel}</div>
                    <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white/90">{activity.designation}</h3>
                  </div>
                  <span className="rounded-full border border-gray-300 px-2.5 py-1 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300">
                    {formatAmount(activity.montant)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-white/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Commandes</div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{activity.totalCommandes}</div>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-white/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Recettes</div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{formatAmount(activity.revenue)}</div>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-white/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Traitees</div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{activity.successCount}</div>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-white/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Date limite</div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{formatDateLabel(activity.dateLimite)}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => downloadActivityCsv(activity)}
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
                  >
                    Rapport CSV
                  </button>
                  <Link
                    href={`/activity/${activity.id}`}
                    className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-brand-600"
                  >
                    Modifier notes
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <LatestTransactions
        title="Historique des commandes d'activites"
        description="Historique complet des commandes activity de l'annee en cours."
        rows={snapshot.latestTransactions}
        categoryFilter={transactionsCategoryFilter}
        onCategoryFilterChange={setTransactionsCategoryFilter}
      />
    </div>
  );
}
