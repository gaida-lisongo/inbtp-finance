import Link from "next/link";

import type { TeacherRecoursNotificationSnapshot } from "@/lib/utils/supabase/teacher-notifications";

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const getRecoursStatusLabel = (value: boolean | null) => (value === true ? "Traite" : "En attente");

const getRecoursStatusClassName = (value: boolean | null) =>
  value === true
    ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300"
    : "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300";

export default function TeacherDashboardRecours({ snapshot }: { snapshot: TeacherRecoursNotificationSnapshot }) {
  return (
    <section id="historique-recours" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Recours</div>
          <div className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white/90">{snapshot.totalCount}</div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">En attente</div>
          <div className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white/90">{snapshot.pendingCount}</div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Traites</div>
          <div className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white/90">{snapshot.resolvedCount}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Historique des recours</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Cette liste reprend les reclamations de notes liees aux matieres dont vous etes titulaire.
            </p>
          </div>
        </div>

        {snapshot.items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 px-5 py-8 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
            Aucun recours n&apos;est encore rattache a vos cours.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {snapshot.items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-brand-500">
                      {item.matiere?.designation || "Matiere"}{item.programme?.designation ? ` • ${item.programme.designation}` : ""}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white/90">
                      {item.object || "Recours de note"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {item.student?.displayName || "Etudiant inconnu"}{item.student?.email ? ` • ${item.student.email}` : ""}
                    </p>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRecoursStatusClassName(item.recoursStatus)}`}>
                    {getRecoursStatusLabel(item.recoursStatus)}
                  </div>
                </div>

                {item.description ? (
                  <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{item.description}</p>
                ) : null}

                {item.observation ? (
                  <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-white/[0.03] dark:text-gray-200">
                    {item.observation}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <div>
                    {item.category || "Recours"} • {formatDateTime(item.createdAt)}
                  </div>
                  {item.path ? (
                    <Link
                      href={item.path}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
                    >
                      Ouvrir
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
