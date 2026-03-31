"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { StudentProgrammePageData } from "@/lib/utils/supabase/student-teaching";

type StudentProgrammePanelProps = {
  data: StudentProgrammePageData;
};

const formatSemesterCredits = (value: number | null) => `${value ?? 0} credits`;

export default function StudentProgrammePanel({ data }: StudentProgrammePanelProps) {
  const { programme, semestres, summary } = data;
  const [selectedSemestreId, setSelectedSemestreId] = useState<string | null>(semestres[0]?.id ?? null);

  useEffect(() => {
    setSelectedSemestreId(semestres[0]?.id ?? null);
  }, [semestres]);

  const activeSemestre = useMemo(
    () => semestres.find((semestre) => semestre.id === selectedSemestreId) ?? semestres[0] ?? null,
    [selectedSemestreId, semestres],
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-sm text-gray-500 dark:text-gray-400">Semestres</div>
          <div className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white/90">{summary.semestreCount}</div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Structure académique de la promotion</div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-sm text-gray-500 dark:text-gray-400">Unités d&apos;enseignement</div>
          <div className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white/90">{summary.uniteCount}</div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">UE rattachées à {programme.designation || "la promotion"}</div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-sm text-gray-500 dark:text-gray-400">Matières</div>
          <div className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white/90">{summary.matiereCount}</div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Cours disponibles dans cette promotion</div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-sm text-gray-500 dark:text-gray-400">Crédits</div>
          <div className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white/90">{summary.totalCredits}</div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Volume de la promotion</div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
          {semestres.map((semestre) => {
            const isActive = semestre.id === activeSemestre?.id;

            return (
              <button
                key={semestre.id}
                type="button"
                onClick={() => setSelectedSemestreId(semestre.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                }`}
              >
                {semestre.designation || "Semestre"}
                <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-white/15 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
                  {formatSemesterCredits(semestre.credits)}
                </span>
              </button>
            );
          })}
        </div>

        {activeSemestre ? (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl bg-gray-50 p-5 dark:bg-white/[0.03]">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Semestre actif</p>
                  <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">
                    {activeSemestre.designation || "Semestre"}
                  </h2>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {activeSemestre.unitesCount} unités • {activeSemestre.matieresCount} matières • {formatSemesterCredits(activeSemestre.credits)}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="text-gray-500 dark:text-gray-400">Crédits UE</div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{activeSemestre.usedCredits}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="text-gray-500 dark:text-gray-400">Matières</div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{activeSemestre.matieresCount}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {activeSemestre.unites.length > 0 ? (
                activeSemestre.unites.map((unite) => (
                  <article
                    key={unite.id}
                    className="rounded-3xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
                  >
                    <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                            {unite.code || "UE"}
                          </div>
                          <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white/90">
                            {unite.designation || "Unité sans designation"}
                          </h3>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {unite.matieresCount} matières • {unite.usedCredits}/{unite.credits ?? 0} crédits répartis
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-900">
                            <div className="text-gray-500 dark:text-gray-400">Crédits UE</div>
                            <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{unite.credits ?? 0}</div>
                          </div>
                          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-900">
                            <div className="text-gray-500 dark:text-gray-400">Matières</div>
                            <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{unite.matieresCount}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      {unite.matieres.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {unite.matieres.map((matiere) => (
                            <Link
                              key={matiere.id}
                              href={`/cours/${matiere.id}`}
                              className="group rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-theme-xs transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-theme-sm dark:border-gray-800 dark:from-white/[0.04] dark:to-white/[0.02] dark:hover:border-brand-500/40"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                  {matiere.credits ?? 0} crédits
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {matiere.cours ? "Cours ouvert" : "Cours à venir"}
                                </span>
                              </div>

                              <h4 className="mt-5 text-lg font-semibold text-gray-900 transition group-hover:text-brand-600 dark:text-white/90 dark:group-hover:text-brand-300">
                                {matiere.designation || "Matière sans designation"}
                              </h4>

                              <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                                Ouvrir la fiche du cours et consulter l&apos;espace associé à cette matière.
                              </p>

                              <div className="mt-6 flex items-center justify-between text-sm font-medium text-brand-500 dark:text-brand-300">
                                <span>Accéder au cours</span>
                                <span>→</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                          Aucune matière n&apos;est encore rattachée à cette unité d&apos;enseignement.
                        </div>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Aucune unité d&apos;enseignement n&apos;est encore enregistrée pour ce semestre.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Aucun semestre disponible pour cette promotion.
          </div>
        )}
      </section>
    </div>
  );
}
