import Link from "next/link";

import type { ActivityCategory } from "@/lib/utils/supabase/student-course";

type StudentCourseActivityPageProps = {
  category: ActivityCategory;
  matiereId: string;
  data: {
    programme: {
      id: string;
      designation: string | null;
    };
    unite: {
      designation: string | null;
    };
    matiere: {
      designation: string | null;
    };
    activity: {
      designation: string | null;
      description: string | null;
      montant: number | null;
      date_limite: string | null;
      note: number | null;
    };
  };
};

const categoryTitles: Record<ActivityCategory, string> = {
  tp: "Travaux pratiques",
  qcm: "QCM",
  ressource: "Ressource",
};

const formatAmount = (value: number | null) =>
  typeof value === "number"
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value)
    : "Montant indisponible";

export default function StudentCourseActivityPage({ category, matiereId, data }: StudentCourseActivityPageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="inline-flex rounded-full bg-brand-50 px-4 py-1 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          {categoryTitles[category]}
        </div>
        <h1 className="mt-5 text-3xl font-semibold text-gray-900 dark:text-white/90">
          {data.activity.designation || categoryTitles[category]}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          {data.activity.description || "Le contenu métier de cette activité sera branché dans cette page dédiée."}
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.8fr)]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">Espace activité</h2>
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            La page métier `{category}` est prête. Le prochain passage pourra y brancher le vrai composant fonctionnel.
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">Contexte</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Promotion</div>
                <div className="mt-1 font-medium text-gray-900 dark:text-white/90">{data.programme.designation || "Non renseignée"}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">UE</div>
                <div className="mt-1 font-medium text-gray-900 dark:text-white/90">{data.unite.designation || "Non renseignée"}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Matière</div>
                <div className="mt-1 font-medium text-gray-900 dark:text-white/90">{data.matiere.designation || "Non renseignée"}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Montant</div>
                <div className="mt-1 font-medium text-gray-900 dark:text-white/90">{formatAmount(data.activity.montant)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">Navigation</h2>
            <div className="mt-5">
              <Link
                href={`/cours/${matiereId}`}
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                Retour au cours
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
