"use client";

import { useMemo, useRef, useState } from "react";

import MetricTile from "@/components/education/faculty-dashboard/MetricTile";
import type { ParcoursDashboardSnapshot as ParcoursDashboardSnapshotData, ParcoursDashboardStudentItem } from "@/lib/utils/supabase/parcours-dashboard";

type ParcoursDashboardSnapshotProps = {
  snapshot: ParcoursDashboardSnapshotData;
};

const getStatusClassName = (status: string | null) => {
  switch (status?.trim().toLowerCase()) {
    case "ok":
      return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300";
    case "pending":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300";
    case "no":
      return "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300";
  }
};

const getStatusLabel = (status: string | null) => {
  switch (status?.trim().toLowerCase()) {
    case "ok":
      return "Valide";
    case "pending":
      return "Pending";
    case "no":
      return "Rejete";
    default:
      return "Non defini";
  }
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const downloadCsv = (rows: ParcoursDashboardStudentItem[], programmeLabel: string, onlyFiltered: boolean) => {
  const header = ["Etudiant", "Email", "Reference", "Statut", "Date inscription"];
  const csvRows = rows.map((row) => [
    row.studentName,
    row.studentEmail ?? "",
    row.reference ?? "",
    getStatusLabel(row.status),
    formatDate(row.createdAt),
  ]);

  const csv = [header, ...csvRows]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeProgramme = programmeLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "promotion";

  link.href = url;
  link.setAttribute("download", `parcours-${safeProgramme}-${onlyFiltered ? "filtre" : "complet"}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function ParcoursDashboardSnapshot({ snapshot }: ParcoursDashboardSnapshotProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(snapshot.programmes[0]?.id ?? null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "pending" | "no" | "unknown">("all");

  const selectedProgramme = useMemo(
    () => snapshot.programmes.find((programme) => programme.id === selectedProgrammeId) ?? snapshot.programmes[0] ?? null,
    [selectedProgrammeId, snapshot.programmes],
  );

  const filteredStudents = useMemo(() => {
    if (!selectedProgramme) {
      return [];
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    return selectedProgramme.students.filter((student) => {
      const normalizedStatus = student.status?.trim().toLowerCase();

      if (statusFilter === "unknown") {
        if (normalizedStatus === "ok" || normalizedStatus === "pending" || normalizedStatus === "no") {
          return false;
        }
      } else if (statusFilter !== "all" && normalizedStatus !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        student.studentName.toLowerCase().includes(normalizedSearch) ||
        (student.studentEmail ?? "").toLowerCase().includes(normalizedSearch) ||
        (student.reference ?? "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [searchTerm, selectedProgramme, statusFilter]);

  const maxDistribution = Math.max(...snapshot.distribution.map((item) => item.totalStudents), 1);

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) {
      return;
    }

    const amount = carouselRef.current.clientWidth * 0.85;
    carouselRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          title="Annee active"
          value={snapshot.activeAnnee?.designation ?? "Non definie"}
          helper={snapshot.dateWindow.label ?? "Periode non renseignee"}
          tone="slate"
        />
        <MetricTile title="Parcours" value={String(snapshot.summary.totalCount)} helper="Inscriptions toutes promotions" tone="blue" />
        <MetricTile title="Valides" value={String(snapshot.summary.okCount)} helper={`${snapshot.summary.pendingCount} en attente`} tone="green" />
        <MetricTile
          title="Promotions"
          value={String(snapshot.summary.programmesCount)}
          helper={`${snapshot.summary.unknownCount} statuts non definis`}
          tone="amber"
        />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">Distribution des etudiants par promotion</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Annee active: {snapshot.activeAnnee?.designation ?? "Aucune"}</p>

        {snapshot.distribution.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 px-5 py-8 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
            Aucune promotion ou aucun parcours sur l&apos;annee active.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {snapshot.distribution.map((item) => {
              const width = Math.max(6, Math.round((item.totalStudents / maxDistribution) * 100));

              return (
                <div key={item.programmeId} className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)_80px] sm:items-center">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.programmeDesignation ?? "Promotion non renseignee"}</div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${width}%` }} />
                  </div>
                  <div className="text-right text-sm font-semibold text-gray-700 dark:text-gray-300">{item.totalStudents}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">Promotions (carrousel)</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Selectionnez une promotion pour voir tous les etudiants inscrits, filtrer et exporter en CSV.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollCarousel("left")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
              aria-label="Defiler a gauche"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel("right")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
              aria-label="Defiler a droite"
            >
              ›
            </button>
          </div>
        </div>

        {snapshot.programmes.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 px-5 py-8 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
            Aucune promotion a afficher.
          </div>
        ) : (
          <div ref={carouselRef} className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1">
            {snapshot.programmes.map((programme) => (
              <article
                key={programme.id}
                className={`w-[320px] shrink-0 snap-start rounded-2xl border p-4 ${
                  selectedProgramme?.id === programme.id
                    ? "border-brand-500 bg-brand-500/[0.04]"
                    : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">{programme.designation ?? "Promotion"}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{programme.filiereDesignation ?? "Filiere non renseignee"}</p>
                  </div>
                  <span className="rounded-full border border-gray-300 px-2.5 py-1 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300">
                    {programme.totalStudents} inscrits
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-white/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Valides</div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{programme.okCount}</div>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-white/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Pending</div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{programme.pendingCount}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProgrammeId(programme.id)}
                    className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
                  >
                    Voir les inscrits
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCsv(programme.students, programme.designation ?? "promotion", false)}
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                  >
                    CSV complet
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
              {selectedProgramme?.designation ?? "Promotion"} - etudiants inscrits
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Recherche et filtre par statut des parcours de la promotion.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!selectedProgramme) {
                return;
              }

              downloadCsv(filteredStudents, selectedProgramme.designation ?? "promotion", true);
            }}
            disabled={!selectedProgramme || filteredStudents.length === 0}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
          >
            Telecharger resultat filtre (CSV)
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr]">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher par nom, email ou reference"
            className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-400 dark:border-gray-700 dark:text-gray-200"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "ok" | "pending" | "no" | "unknown")}
            className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-400 dark:border-gray-700 dark:text-gray-200"
          >
            <option value="all">Tous les statuts</option>
            <option value="ok">Valide</option>
            <option value="pending">Pending</option>
            <option value="no">Rejete</option>
            <option value="unknown">Non defini</option>
          </select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Etudiant</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Statut</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date inscription</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((row) => (
                  <tr key={row.parcoursId} className="border-b border-gray-100 dark:border-white/[0.05]">
                    <td className="px-3 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white/90">{row.studentName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{row.studentEmail ?? "Email non renseigne"}</p>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-700 dark:text-gray-300">{row.reference ?? "Sans reference"}</td>
                    <td className="px-3 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClassName(row.status)}`}>
                        {getStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(row.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    Aucun etudiant ne correspond au filtre actuel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
