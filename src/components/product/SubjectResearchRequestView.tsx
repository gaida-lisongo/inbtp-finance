"use client";

import { useMemo, useState } from "react";

type SectionRow = {
  section: string;
  content: string;
};

type SubjectResearchRequestViewProps = {
  productId: string;
  title: string;
  studentName: string;
  description: string | null;
  requestStatus?: string;
  requestError?: string;
  notificationSujetId?: string;
  requestLocked?: boolean;
};

const createEmptySection = (): SectionRow => ({ section: "", content: "" });

const StringListField = ({
  label,
  values,
  setValues,
}: {
  label: string;
  values: string[];
  setValues: (updater: (previous: string[]) => string[]) => void;
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <button
          type="button"
          onClick={() => setValues((previous) => [...previous, ""])}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.04]"
        >
          Ajouter
        </button>
      </div>

      <div className="space-y-3">
        {values.map((value, index) => (
          <div key={`${label}-${index}`} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Element {index + 1}</span>
              {values.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setValues((previous) => previous.filter((_, currentIndex) => currentIndex !== index))
                  }
                  className="rounded-lg border border-error-200 px-2.5 py-1 text-xs font-medium text-error-700 hover:bg-error-50 dark:border-error-500/40 dark:text-error-300 dark:hover:bg-error-500/10"
                >
                  Supprimer
                </button>
              ) : null}
            </div>
            <textarea
              value={value}
              onChange={(event) =>
                setValues((previous) =>
                  previous.map((item, currentIndex) => (currentIndex === index ? event.target.value : item)),
                )
              }
              rows={3}
              placeholder="Saisissez le contenu (les retours a la ligne sont conserves)."
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const StructuredListField = ({
  label,
  values,
  setValues,
}: {
  label: string;
  values: SectionRow[];
  setValues: (updater: (previous: SectionRow[]) => SectionRow[]) => void;
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <button
          type="button"
          onClick={() => setValues((previous) => [...previous, createEmptySection()])}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.04]"
        >
          Ajouter
        </button>
      </div>

      <div className="space-y-3">
        {values.map((value, index) => (
          <div key={`${label}-${index}`} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Section {index + 1}</span>
              {values.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setValues((previous) => previous.filter((_, currentIndex) => currentIndex !== index))
                  }
                  className="rounded-lg border border-error-200 px-2.5 py-1 text-xs font-medium text-error-700 hover:bg-error-50 dark:border-error-500/40 dark:text-error-300 dark:hover:bg-error-500/10"
                >
                  Supprimer
                </button>
              ) : null}
            </div>

            <div className="grid gap-3">
              <input
                value={value.section}
                onChange={(event) =>
                  setValues((previous) =>
                    previous.map((item, currentIndex) =>
                      currentIndex === index ? { ...item, section: event.target.value } : item,
                    ),
                  )
                }
                placeholder="Intitule de la section"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <textarea
                value={value.content}
                onChange={(event) =>
                  setValues((previous) =>
                    previous.map((item, currentIndex) =>
                      currentIndex === index ? { ...item, content: event.target.value } : item,
                    ),
                  )
                }
                rows={4}
                placeholder="Contenu de la section (retours a la ligne conserves)."
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function SubjectResearchRequestView({
  productId,
  title,
  studentName,
  description,
  requestStatus,
  requestError,
  notificationSujetId,
  requestLocked = false,
}: SubjectResearchRequestViewProps) {
  const [thematique, setThematique] = useState<string[]>([""]);
  const [justification, setJustification] = useState<string[]>([""]);
  const [problematique, setProblematique] = useState<string[]>([""]);
  const [objectif, setObjectif] = useState<string[]>([""]);
  const [methodologie, setMethodologie] = useState<SectionRow[]>([createEmptySection()]);
  const [resultatsAttendus, setResultatsAttendus] = useState<SectionRow[]>([createEmptySection()]);
  const [chronogrammes, setChronogrammes] = useState<SectionRow[]>([createEmptySection()]);
  const [references, setReferences] = useState<SectionRow[]>([createEmptySection()]);

  const thematiqueJson = useMemo(() => JSON.stringify(thematique), [thematique]);
  const justificationJson = useMemo(() => JSON.stringify(justification), [justification]);
  const problematiqueJson = useMemo(() => JSON.stringify(problematique), [problematique]);
  const objectifJson = useMemo(() => JSON.stringify(objectif), [objectif]);
  const methodologieJson = useMemo(() => JSON.stringify(methodologie), [methodologie]);
  const resultatsAttendusJson = useMemo(() => JSON.stringify(resultatsAttendus), [resultatsAttendus]);
  const chronogrammesJson = useMemo(() => JSON.stringify(chronogrammes), [chronogrammes]);
  const referencesJson = useMemo(() => JSON.stringify(references), [references]);

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="inline-flex rounded-full bg-brand-50 px-4 py-1 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
        Sujet de recherche
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-gray-900 dark:text-white/90">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
        Completez ce formulaire pour soumettre votre projet de recherche. Le schema `notifications_sujet` sera hydrate et une page de garde sera generee.
      </p>

      {requestStatus === "success" ? (
        <div className="mt-4 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
          Projet enregistre. La notification a ete transmise aux organisateurs.
        </div>
      ) : null}

      {requestError ? (
        <div className="mt-4 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
          {requestError}
        </div>
      ) : null}

      {requestLocked ? (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
          Cette soumission est deja traitee. Une nouvelle payload n&apos;est plus autorisee.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2">
        <div>
          <div className="text-gray-500 dark:text-gray-400">Etudiant</div>
          <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{studentName}</div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">Produit</div>
          <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{title}</div>
        </div>
        {description ? (
          <div className="sm:col-span-2">
            <div className="text-gray-500 dark:text-gray-400">Contexte</div>
            <div className="mt-1 whitespace-pre-line text-gray-700 dark:text-gray-300">{description}</div>
          </div>
        ) : null}
      </div>

      <form
        action={`/product/sujets/${productId}/project`}
        method="post"
        className="mt-6 grid gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <input type="hidden" name="thematique_json" value={thematiqueJson} />
        <input type="hidden" name="justification_json" value={justificationJson} />
        <input type="hidden" name="problematique_json" value={problematiqueJson} />
        <input type="hidden" name="objectif_json" value={objectifJson} />
        <input type="hidden" name="methodologie_json" value={methodologieJson} />
        <input type="hidden" name="resultats_attendus_json" value={resultatsAttendusJson} />
        <input type="hidden" name="chronogrammes_json" value={chronogrammesJson} />
        <input type="hidden" name="references_json" value={referencesJson} />

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="subject_title">
              Titre du sujet
            </label>
            <input
              id="subject_title"
              name="subject_title"
              required
              placeholder="Ex: Optimisation des structures en beton arme..."
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="director_name">
              Directeur
            </label>
            <input
              id="director_name"
              name="director_name"
              required
              placeholder="Ex: Pr. Nom Prenom"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="co_director_name">
              Co-directeur (optionnel)
            </label>
            <input
              id="co_director_name"
              name="co_director_name"
              placeholder="Ex: Dr. Nom Prenom"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>

        <StringListField label="Thematique (JSON sections[])" values={thematique} setValues={setThematique} />
        <StringListField label="Justification (JSON sections[])" values={justification} setValues={setJustification} />
        <StringListField label="Problematique (JSON sections[])" values={problematique} setValues={setProblematique} />
        <StringListField label="Objectif (JSON sections[])" values={objectif} setValues={setObjectif} />

        <StructuredListField label="Methodologie (JSONB {section, content}[])" values={methodologie} setValues={setMethodologie} />
        <StructuredListField
          label="Resultats attendus (JSONB {section, content}[])"
          values={resultatsAttendus}
          setValues={setResultatsAttendus}
        />
        <StructuredListField
          label="Chronogrammes (JSONB {section, content}[])"
          values={chronogrammes}
          setValues={setChronogrammes}
        />
        <StructuredListField label="References (JSONB {section, content}[])" values={references} setValues={setReferences} />

        <div className="flex flex-wrap justify-end gap-3">
          {requestStatus === "success" && notificationSujetId ? (
            <a
              href={`/api/notifications/sujets/${encodeURIComponent(notificationSujetId)}/cover`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
            >
              Ouvrir la page de garde
            </a>
          ) : null}
          <button
            type="submit"
            disabled={requestLocked}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Soumettre le projet
          </button>
        </div>
      </form>
    </section>
  );
}
