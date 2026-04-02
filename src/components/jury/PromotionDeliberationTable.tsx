"use client";

import { useDeferredValue, useMemo, useState } from "react";

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
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    results[0]?.studentId ?? null,
  );
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
    if (selectedStudentId === null) return null;
    const stillVisible = filteredResults.some((item) => item.studentId === selectedStudentId);
    return stillVisible ? selectedStudentId : (filteredResults[0]?.studentId ?? null);
  }, [filteredResults, selectedStudentId]);

  const selected = useMemo(() => {
    if (!activeStudentId) return null;
    return results.find((row) => row.studentId === activeStudentId) ?? null;
  }, [activeStudentId, results]);

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 p-5 dark:border-gray-800">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
            Étudiants
          </p>
          <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
            Liste de délibération
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filteredResults.length} sur {results.length} étudiants affichés
          </p>

          <div className="mt-4">
            <input
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              type="search"
              placeholder="Rechercher un étudiant, une référence, une mention..."
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-red-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
          </div>
        </div>

        <div className="max-h-[72vh] overflow-y-auto">
          {filteredResults.length === 0 ? (
            <div className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
              Aucun étudiant ne correspond à la recherche.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredResults.map((item, index) => {
                const isActive = item.studentId === activeStudentId;

                return (
                  <button
                    key={item.studentId}
                    type="button"
                    onClick={() => setSelectedStudentId(item.studentId)}
                    className={`block w-full px-5 py-4 text-left transition ${
                      isActive
                        ? "bg-red-50 dark:bg-red-500/10"
                        : "hover:bg-gray-50 dark:hover:bg-gray-950/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                          Rang {index + 1}
                        </p>
                        <h3 className="mt-2 truncate font-semibold text-gray-900 dark:text-white">
                          {item.studentName}
                        </h3>
                        <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                          Réf. {item.reference || "—"}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {item.pourcentage.toFixed(2)}%
                        </p>
                        <p className="text-sm font-semibold text-red-600 dark:text-red-300">
                          {item.mention}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
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
      </aside>

      <div className="min-w-0">
        {activeStudentId && selected ? (
          <StudentDeliberation
            juryId={juryId}
            promotionId={promotionId}
            studentId={activeStudentId}
            onClose={() => setSelectedStudentId(null)}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
              Délibération étudiant
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
              Sélectionne un étudiant
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Choisis un étudiant dans la liste pour afficher ses notes et préparer la délibération.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
