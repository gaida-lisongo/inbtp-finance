"use client";

import type { SubjectRequestNotificationItem } from "@/lib/utils/supabase/sujet-notifications";
import { useMemo, useState } from "react";

const SUBJECT_SCORE_RULES = [
  { key: "clarte", label: "Clarte", points: 1, hint: "Compréhension immédiate du sujet proposé." },
  { key: "faisabilite", label: "Faisabilite", points: 3, hint: "Capacité réelle d'exécution dans le temps imparti." },
  { key: "originalite", label: "Originalite", points: 5, hint: "Niveau de nouveauté ou d'apport différenciant." },
  { key: "artefact", label: "Artefact", points: 7, hint: "Valeur attendue du livrable, prototype ou résultat final." },
  { key: "pertinence", label: "Pertinence", points: 9, hint: "Adéquation avec le programme et les besoins ciblés." },
] as const;

type SubjectEvaluationPanelProps = {
  item: SubjectRequestNotificationItem;
};

const formatBooleanLabel = (value: boolean | null) => {
  if (value === true) return "Valide";
  if (value === false) return "Rejete";
  return "En attente";
};

const distributeScoreLikeChmod = (note: number | null) => {
  if (note === null || !Number.isFinite(note)) {
    return new Map<string, number>();
  }

  let remaining = Math.max(0, Math.min(25, Math.round(note)));
  const scores = new Map<string, number>();

  for (const rule of [...SUBJECT_SCORE_RULES].reverse()) {
    const current = Math.min(rule.points, remaining);
    scores.set(rule.key, current);
    remaining -= current;
  }

  return new Map(SUBJECT_SCORE_RULES.map((rule) => [rule.key, scores.get(rule.key) ?? 0]));
};

export default function SubjectEvaluationPanel({ item }: SubjectEvaluationPanelProps) {
  const noteIsMissing = item.note === null;
  const validationIsMissing = item.validation === null;
  const distributedScores = distributeScoreLikeChmod(item.note);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [decision, setDecision] = useState<"true" | "false" | null>(null);
  const [observations, setObservations] = useState(item.observations.join("\n"));

  const draftNote = useMemo(
    () =>
      SUBJECT_SCORE_RULES.reduce((sum, rule) => {
        return sum + (selectedCriteria.includes(rule.key) ? rule.points : 0);
      }, 0),
    [selectedCriteria],
  );

  const toggleCriterion = (key: string) => {
    setSelectedCriteria((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  };

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Evaluation du projet</p>
          <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white/90">Grille de notation sur 25 points</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Repartition type chmod: 1 + 3 + 5 + 7 + 9 = 25.
          </p>
        </div>
        <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-right dark:border-brand-500/20 dark:bg-brand-500/10">
          <p className="text-xs uppercase tracking-wide text-brand-700 dark:text-brand-300">Statut actuel</p>
          <p className="mt-1 text-lg font-semibold text-brand-900 dark:text-white">{item.note ?? draftNote ?? "--"}/25</p>
          <p className="mt-1 text-xs text-brand-700 dark:text-brand-300">
            {item.note === null ? "Score en preparation" : formatBooleanLabel(item.validation)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
        <div className="space-y-4">
          {SUBJECT_SCORE_RULES.map((rule) => {
            const isSelected = selectedCriteria.includes(rule.key);

            return (
              <article key={rule.key} className="rounded-2xl border border-gray-200 px-5 py-4 dark:border-gray-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">{rule.label}</h3>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        {rule.points} pt{rule.points > 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{rule.hint}</p>
                  </div>

                  {noteIsMissing ? (
                    <button
                      type="button"
                      onClick={() => toggleCriterion(rule.key)}
                      className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                        isSelected
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "border border-gray-300 text-gray-800 hover:border-brand-500 hover:text-brand-600 dark:border-gray-700 dark:text-gray-100"
                      }`}
                    >
                      {isSelected ? `Critere valide (${rule.points}/${rule.points})` : "Valider ce critere"}
                    </button>
                  ) : (
                    <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                      Score retenu: {distributedScores.get(rule.key) ?? 0}/{rule.points}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <article className="rounded-2xl border border-gray-200 px-5 py-4 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">Decision de validation</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            La validation finale reste ouverte tant que le champ `validation` n'est pas encore renseigné.
          </p>

          {validationIsMissing ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <label className="flex min-w-[180px] items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <input
                  type="radio"
                  name="validation"
                  value="true"
                  checked={decision === "true"}
                  onChange={() => setDecision("true")}
                  className="h-4 w-4"
                />
                Valider le projet
              </label>
              <label className="flex min-w-[180px] items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                <input
                  type="radio"
                  name="validation"
                  value="false"
                  checked={decision === "false"}
                  onChange={() => setDecision("false")}
                  className="h-4 w-4"
                />
                Rejeter le projet
              </label>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-100">
              Decision enregistree: {formatBooleanLabel(item.validation)}
            </div>
          )}
          <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">Observations</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Ce bloc conserve les retours à la ligne pour les remarques de l'administration.
          </p>

          {item.observations.length > 0 ? (
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-900">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">{item.observations.join("\n")}</pre>
            </div>
          ) : (
            <textarea
              rows={8}
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              placeholder="Saisir les observations de validation..."
              className="mt-4 w-full rounded-xl border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-500 dark:border-gray-700 dark:text-white/90"
            />
          )}

          {noteIsMissing && validationIsMissing ? (
            <button
              type="button"
              onClick={() =>
                console.log("subject validation draft", {
                  note: draftNote,
                  validation: decision === null ? null : decision === "true",
                  observations,
                  criteres: selectedCriteria,
                })
              }
              className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700"
            >
              Valider le projet
            </button>
          ) : null}
        </article>
      </div>
    </section>
  );
}
