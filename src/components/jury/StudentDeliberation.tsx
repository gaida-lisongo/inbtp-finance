"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

import JuryPasswordModal from "@/components/jury/JuryPasswordModal";

type StudentHeader = {
  id: string;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  email: string | null;
  reference: string | null;
};

type CourseCotation = {
  cours_id: string;
  matiere: { id: string; designation: string | null; credits: number | null };
  unite: { id: string; code: string | null; designation: string | null } | null;
  semestre: { id: string; designation: string | null } | null;
  cotation: {
    id: string | null;
    cc: number | null;
    examen: number | null;
    rattrapage: number | null;
    rachat: number | null;
    is_validate: string | null;
  } | null;
};

type SessionSummary = {
  ncv: number;
  ncnv: number;
  totalObtenu: number;
  totalMax: number;
  pourcentage: number;
  mention: string;
};

type DeliberationElement = {
  _id: string;
  designation: string;
  credit: number;
  cc: number;
  examen: number;
  noteSession: number;
  rattrapage: number;
  noteFinale: number;
};

type DeliberationUnite = {
  _id: string;
  code: string;
  designation: string;
  credit: number;
  moyenne: number;
  isValide: boolean;
  elements: DeliberationElement[];
};

type DeliberationSemestre = {
  _id: string;
  designation: string;
  ncv: number;
  ncnv: number;
  pourcentage: number;
  mention: string;
  unites: DeliberationUnite[];
};

type StudentDeliberationResult = {
  studentId: string;
  studentName: string;
  matricule: string;
  promotion: SessionSummary;
  semestres: DeliberationSemestre[];
};

type StudentDeliberationData = {
  student: StudentHeader;
  result: StudentDeliberationResult | null;
  courses: Array<{
    cours_id: string;
    matiere: CourseCotation["matiere"];
    unite: CourseCotation["unite"];
    semestre: CourseCotation["semestre"];
    cotation: CourseCotation["cotation"];
  }>;
};

type StudentDeliberationProps = {
  juryId: string;
  promotionId: string;
  studentId: string;
  onClose: () => void;
};

const EMPTY_COURSES: StudentDeliberationData["courses"] = [];

const formatStudentName = (student: StudentHeader) =>
  [student.prenom, student.post_nom, student.nom].filter(Boolean).join(" ").trim() ||
  student.email ||
  student.id;

const safeNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getLiveScores = (values: {
  cc: number | null;
  examen: number | null;
  rattrapage: number | null;
}) => {
  const session = (values.cc ?? 0) + (values.examen ?? 0);
  const final = Math.max(session, values.rattrapage ?? 0);

  return {
    session: Math.round(session * 100) / 100,
    final: Math.round(final * 100) / 100,
  };
};

const metricCards = (summary: SessionSummary) => [
  {
    label: "Décision",
    value: summary.mention,
    hint: `${summary.pourcentage.toFixed(2)}%`,
  },
  {
    label: "Unités validées",
    value: String(summary.ncv),
    hint: "NCV",
  },
  {
    label: "Unités non validées",
    value: String(summary.ncnv),
    hint: "NCNV",
  },
  {
    label: "Points obtenus",
    value: `${summary.totalObtenu.toFixed(2)} / ${summary.totalMax.toFixed(2)}`,
    hint: "Total programme",
  },
];

export default function StudentDeliberation({
  juryId,
  promotionId,
  studentId,
  onClose,
}: StudentDeliberationProps) {
  const [data, setData] = useState<StudentDeliberationData | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [isPasswordOpen, setPasswordOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, CourseCotation["cotation"]>>({});
  const [courseQuery, setCourseQuery] = useState("");
  const [selectedSemestreId, setSelectedSemestreId] = useState("all");
  const deferredCourseQuery = useDeferredValue(courseQuery);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    try {
      const resp = await fetch(
        `/api/jury/jury/${juryId}/promotion/${promotionId}/students/${studentId}`,
        { cache: "no-store" },
      );
      const payload = (await resp.json()) as StudentDeliberationData & {
        error?: string;
      };
      if (!resp.ok) {
        throw new Error(payload?.error || "Erreur de chargement.");
      }
      setData(payload);
      const initialDraft: Record<string, CourseCotation["cotation"]> = {};
      for (const course of payload.courses ?? []) {
        initialDraft[course.cours_id] = {
          id: course.cotation?.id ?? null,
          cc: course.cotation?.cc ?? null,
          examen: course.cotation?.examen ?? null,
          rattrapage: course.cotation?.rattrapage ?? null,
          rachat: course.cotation?.rachat ?? null,
          is_validate: course.cotation?.is_validate ?? null,
        };
      }
      setDraft(initialDraft);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erreur inconnue.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [juryId, promotionId, studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const courses = useMemo(() => data?.courses ?? EMPTY_COURSES, [data?.courses]);
  const studentLabel = data?.student ? formatStudentName(data.student) : "";
  const summary = data?.result?.promotion ?? null;

  const semestreOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const semestre of data?.result?.semestres ?? []) {
      map.set(semestre._id, semestre.designation);
    }
    for (const course of courses) {
      if (!course.semestre?.id) continue;
      map.set(course.semestre.id, course.semestre.designation ?? "Semestre");
    }

    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [courses, data?.result?.semestres]);

  const courseMetaByMatiereId = useMemo(
    () =>
      new Map(
        courses.map((course) => [
          course.matiere.id,
          {
            coursId: course.cours_id,
            unite: course.unite,
            semestre: course.semestre,
          },
        ]),
      ),
    [courses],
  );

  const updateDraft = useCallback(
    (coursId: string, field: keyof NonNullable<CourseCotation["cotation"]>, value: unknown) => {
      setDraft((prev) => ({
        ...prev,
        [coursId]: {
          ...(prev[coursId] ?? {
            id: null,
            cc: null,
            examen: null,
            rattrapage: null,
            rachat: null,
            is_validate: null,
          }),
          [field]:
            field === "is_validate"
              ? typeof value === "string"
                ? value
                : null
              : safeNumber(value),
        },
      }));
    },
    [],
  );

  const pendingItems = useMemo(() => {
    return courses
      .map((course) => {
        const current = draft[course.cours_id] ?? null;
        if (!current) return null;
        return {
          cours_id: course.cours_id,
          cc: current.cc,
          examen: current.examen,
          rattrapage: current.rattrapage,
          rachat: current.rachat,
          is_validate: current.is_validate,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [courses, draft]);

  const normalizedCourseQuery = deferredCourseQuery.trim().toLowerCase();

  const filteredSemestres = useMemo(() => {
    const semestres = data?.result?.semestres ?? [];

    return semestres
      .filter((semestre) => selectedSemestreId === "all" || semestre._id === selectedSemestreId)
      .map((semestre) => ({
        ...semestre,
        unites: semestre.unites
          .map((unite) => ({
            ...unite,
            elements: unite.elements.filter((element) => {
              if (!normalizedCourseQuery) return true;

              const keywords = [
                element.designation,
                unite.code,
                unite.designation,
                semestre.designation,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              return keywords.includes(normalizedCourseQuery);
            }),
          }))
          .filter((unite) => unite.elements.length > 0),
      }))
      .filter((semestre) => semestre.unites.length > 0);
  }, [data?.result?.semestres, normalizedCourseQuery, selectedSemestreId]);

  const openPassword = useCallback(() => {
    setSaveError(null);
    setPasswordOpen(true);
  }, []);

  const closePassword = useCallback(() => {
    setPasswordOpen(false);
  }, []);

  const handleSave = useCallback(
    async (password: string) => {
      setSaving(true);
      setSaveError(null);
      try {
        const resp = await fetch(
          `/api/jury/jury/${juryId}/promotion/${promotionId}/students/${studentId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              password,
              items: pendingItems,
            }),
          },
        );
        const payload = (await resp.json()) as { ok?: boolean; error?: string };
        if (!resp.ok || payload.ok !== true) {
          throw new Error(payload.error || "Impossible d'enregistrer.");
        }
        setPasswordOpen(false);
        await fetchData();
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Erreur inconnue.");
      } finally {
        setSaving(false);
      }
    },
    [fetchData, juryId, pendingItems, promotionId, studentId],
  );

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
            Délibération étudiant
          </p>
          <h2 className="mt-1 truncate text-2xl font-semibold text-gray-900 dark:text-white">
            {studentLabel || "Étudiant"}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Référence: {data?.student.reference ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-gray-300 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
            disabled={isLoading || isSaving}
          >
            Actualiser
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-gray-300 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
            disabled={isSaving}
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={openPassword}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
            disabled={isLoading || isSaving || pendingItems.length === 0}
          >
            Enregistrer
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
      ) : loadError ? (
        <p className="mt-5 text-sm text-red-600 dark:text-red-400">{loadError}</p>
      ) : data ? (
        <div className="mt-6 space-y-6">
          {summary ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metricCards(summary).map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-950"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                    {card.value}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {card.hint}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                  Rechercher un cours
                </label>
                <input
                  value={courseQuery}
                  onChange={(event) => setCourseQuery(event.target.value)}
                  type="search"
                  placeholder="Matière, unité, code, semestre..."
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-red-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                  Filtrer par semestre
                </label>
                <select
                  value={selectedSemestreId}
                  onChange={(event) => setSelectedSemestreId(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-red-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  <option value="all">Tous les semestres</option>
                  {semestreOptions.map((semestre) => (
                    <option key={semestre.id} value={semestre.id}>
                      {semestre.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredSemestres.length ? (
            filteredSemestres.map((semestre) => (
              <section
                key={semestre._id}
                className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
              >
                <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-950 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {semestre.designation}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {semestre.ncv} unités validées, {semestre.ncnv} non validées
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-white px-3 py-1 font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                      {semestre.pourcentage.toFixed(2)}%
                    </span>
                    <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-300">
                      Mention {semestre.mention}
                    </span>
                  </div>
                </div>

                <div className="space-y-5 px-5 py-5">
                  {semestre.unites.map((unite) => (
                    <div key={unite._id} className="space-y-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {unite.code ? `${unite.code} · ` : ""}
                            {unite.designation}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Moyenne {unite.moyenne.toFixed(2)} / 20 · {unite.credit} crédits
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${
                            unite.isValide
                              ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                              : "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
                          }`}
                        >
                          {unite.isValide ? "Validée" : "À statuer"}
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500 dark:bg-gray-950 dark:text-gray-400">
                            <tr>
                              <th className="px-4 py-3 text-left">Matière</th>
                              <th className="px-4 py-3 text-right">Crédits</th>
                              <th className="px-4 py-3 text-right">CC</th>
                              <th className="px-4 py-3 text-right">Examen</th>
                              <th className="px-4 py-3 text-right">Session</th>
                              <th className="px-4 py-3 text-right">Rattrapage</th>
                              <th className="px-4 py-3 text-right">Finale</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-gray-800 dark:text-gray-200">
                            {unite.elements.map((element) => {
                              const courseMeta = courseMetaByMatiereId.get(element._id) ?? null;
                              const current = courseMeta
                                ? draft[courseMeta.coursId]
                                : null;
                              const liveScores = getLiveScores({
                                cc: current?.cc ?? element.cc,
                                examen: current?.examen ?? element.examen,
                                rattrapage: current?.rattrapage ?? element.rattrapage,
                              });

                              return (
                                <tr key={element._id}>
                                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                    {element.designation}
                                  </td>
                                  <td className="px-4 py-3 text-right">{element.credit}</td>
                                  <td className="px-4 py-3">
                                    <input
                                      className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-right text-sm text-gray-800 outline-none focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                                      value={current?.cc ?? element.cc ?? ""}
                                      inputMode="decimal"
                                      onChange={(e) =>
                                        courseMeta
                                          ? updateDraft(
                                              courseMeta.coursId,
                                              "cc",
                                              e.target.value,
                                            )
                                          : undefined
                                      }
                                      disabled={!courseMeta}
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-right text-sm text-gray-800 outline-none focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                                      value={current?.examen ?? element.examen ?? ""}
                                      inputMode="decimal"
                                      onChange={(e) =>
                                        courseMeta
                                          ? updateDraft(
                                              courseMeta.coursId,
                                              "examen",
                                              e.target.value,
                                            )
                                          : undefined
                                      }
                                      disabled={!courseMeta}
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold">
                                    {liveScores.session.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-right text-sm text-gray-800 outline-none focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                                      value={current?.rattrapage ?? element.rattrapage ?? ""}
                                      inputMode="decimal"
                                      onChange={(e) =>
                                        courseMeta
                                          ? updateDraft(
                                              courseMeta.coursId,
                                              "rattrapage",
                                              e.target.value,
                                            )
                                          : undefined
                                      }
                                      disabled={!courseMeta}
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold">
                                    {liveScores.final.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aucun cours ne correspond aux filtres sélectionnés.
            </p>
          )}

          {saveError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
          ) : null}
        </div>
      ) : null}

      <JuryPasswordModal
        isOpen={isPasswordOpen}
        onClose={closePassword}
        onConfirm={handleSave}
        isSubmitting={isSaving}
        error={saveError}
      />
    </div>
  );
}
