"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";

import StudentDeliberation from "@/components/jury/StudentDeliberation";

type PromotionResultRow = {
  studentId: string;
  studentName: string;
  reference: string;
  pourcentage: number;
  mention: string;
  ncv: number;
  ncnv: number;
};

type PromotionDeliberationTableProps = {
  juryId: string;
  promotionId: string;
  results: PromotionResultRow[];
};

export default function PromotionDeliberationTable({
  juryId,
  promotionId,
  results,
}: PromotionDeliberationTableProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentQuery, setStudentQuery] = useState("");
  const deferredStudentQuery = useDeferredValue(studentQuery);

  const filteredResults = useMemo(() => {
    const normalizedQuery = deferredStudentQuery.trim().toLowerCase();
    if (!normalizedQuery) return results;

    return results.filter((item) =>
      `${item.studentName} ${item.reference} ${item.mention}`.toLowerCase().includes(normalizedQuery),
    );
  }, [deferredStudentQuery, results]);

  const activeStudentId = useMemo(() => {
    if (!selectedStudentId) return null;
    return filteredResults.some((item) => item.studentId === selectedStudentId)
      ? selectedStudentId
      : null;
  }, [filteredResults, selectedStudentId]);

  const selected = useMemo(() => {
    if (!activeStudentId) return null;
    return results.find((row) => row.studentId === activeStudentId) ?? null;
  }, [activeStudentId, results]);

  const hasSelection = Boolean(activeStudentId && selected);

  const openStudent = (studentId: string) => {
    startTransition(() => {
      setSelectedStudentId(studentId);
    });
  };

  const closeStudent = () => {
    startTransition(() => {
      setSelectedStudentId(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm transition-all duration-500 ease-out dark:border-gray-800 dark:bg-gray-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(239,68,68,0.08),_transparent_34%),linear-gradient(180deg,rgba(248,250,252,0.7),transparent)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(248,113,113,0.12),_transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.7),transparent)]" />

        <div className="relative flex flex-col gap-6 p-5 xl:flex-row xl:items-start">
          <aside
            className={`min-w-0 transition-all duration-500 ease-out xl:sticky xl:top-6 ${
              hasSelection ? "xl:w-[360px] xl:shrink-0" : "w-full"
            }`}
          >
            <div className="rounded-[24px] border border-gray-200/80 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
              <div className="border-b border-gray-200 p-5 dark:border-gray-800">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                      Étudiants
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                      Liste de délibération
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {filteredResults.length} sur {results.length} étudiants affichés
                    </p>
                  </div>

                  {hasSelection ? (
                    <button
                      type="button"
                      onClick={closeStudent}
                      className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-400 dark:hover:text-red-300"
                    >
                      Fermer le dossier
                    </button>
                  ) : null}
                </div>

                <div className="mt-4">
                  <input
                    value={studentQuery}
                    onChange={(event) => setStudentQuery(event.target.value)}
                    type="search"
                    placeholder="Rechercher un étudiant, une référence, une mention..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-red-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
              </div>

              <div
                className={`max-h-[72vh] overflow-y-auto p-3 transition-all duration-500 ease-out ${
                  hasSelection ? "space-y-2" : ""
                }`}
              >
                {filteredResults.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                    Aucun étudiant ne correspond à la recherche.
                  </div>
                ) : (
                  <div
                    className={`transition-all duration-500 ease-out ${
                      hasSelection
                        ? "space-y-2"
                        : "grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                    }`}
                  >
                    {filteredResults.map((item, index) => {
                      const isActive = item.studentId === activeStudentId;

                      return (
                        <button
                          key={item.studentId}
                          type="button"
                          onClick={() => openStudent(item.studentId)}
                          className={`group block w-full overflow-hidden rounded-[22px] border px-5 py-4 text-left transition-all duration-500 ease-out ${
                            isActive
                              ? "border-red-200 bg-red-50 shadow-lg shadow-red-100/60 dark:border-red-500/30 dark:bg-red-500/10 dark:shadow-none"
                              : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg hover:shadow-gray-200/70 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-red-500/30 dark:hover:shadow-none"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                                Rang {index + 1}
                              </p>
                              <h3 className="mt-2 truncate text-base font-semibold text-gray-900 dark:text-white">
                                {item.studentName}
                              </h3>
                              <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                                Réf. {item.reference || "—"}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                                {item.pourcentage.toFixed(2)}%
                              </p>
                              <p className="text-sm font-semibold text-red-600 dark:text-red-300">
                                {item.mention}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              NCV {item.ncv}
                            </span>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              NCNV {item.ncnv}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>

          <div
            className={`min-w-0 flex-1 overflow-hidden transition-all duration-500 ease-out ${
              hasSelection
                ? "max-h-[4000px] translate-x-0 opacity-100"
                : "pointer-events-none max-h-0 translate-x-8 opacity-0 xl:max-h-[1px]"
            }`}
          >
            {activeStudentId && selected ? (
              <div className="transition-all duration-500 ease-out">
                <StudentDeliberation
                  juryId={juryId}
                  promotionId={promotionId}
                  studentId={activeStudentId}
                  onClose={closeStudent}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
