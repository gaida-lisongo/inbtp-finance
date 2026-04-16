import Link from "next/link";
import { redirect } from "next/navigation";

import { getSubjectRequestNotifications } from "@/lib/utils/supabase/sujet-notifications";

const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const renderSimpleSections = (label: string, sections: string[]) => (
  <div className="space-y-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
    <h4 className="text-sm font-semibold text-gray-900 dark:text-white/90">{label}</h4>
    {sections.length === 0 ? (
      <p className="text-sm text-gray-500 dark:text-gray-400">Aucune section renseignee.</p>
    ) : (
      <div className="space-y-2">
        {sections.map((section, index) => (
          <pre
            key={`${label}-${index}`}
            className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            {section}
          </pre>
        ))}
      </div>
    )}
  </div>
);

const renderStructuredSections = (label: string, sections: Array<{ section: string; content: string }>) => (
  <div className="space-y-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
    <h4 className="text-sm font-semibold text-gray-900 dark:text-white/90">{label}</h4>
    {sections.length === 0 ? (
      <p className="text-sm text-gray-500 dark:text-gray-400">Aucune section renseignee.</p>
    ) : (
      <div className="space-y-3">
        {sections.map((item, index) => (
          <article key={`${label}-${index}`} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
            <h5 className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.section}</h5>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">{item.content}</pre>
          </article>
        ))}
      </div>
    )}
  </div>
);

export default async function SubjectNotificationsPage() {
  let items: Awaited<ReturnType<typeof getSubjectRequestNotifications>> = [];
  let errorMessage: string | null = null;

  try {
    items = await getSubjectRequestNotifications();
  } catch (error) {
    if (error instanceof Error && error.message === "access_denied") {
      redirect("/signin?error=access_denied");
    }

    errorMessage = error instanceof Error ? error.message : "Erreur de chargement des notifications sujet.";
  }

  const pendingCount = items.filter((item) => item.notificationStatus !== true).length;
  const doneCount = items.filter((item) => item.notificationStatus === true).length;

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Notifications sujets</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">Projets de recherche soumis</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Les organisateurs consultent ici les soumissions `notifications_sujet` et peuvent generer la page de garde officielle.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500">Total</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500">En attente</p>
          <p className="mt-2 text-2xl font-semibold text-warning-700 dark:text-warning-300">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500">Traitees</p>
          <p className="mt-2 text-2xl font-semibold text-success-700 dark:text-success-300">{doneCount}</p>
        </div>
      </section>

      {errorMessage ? (
        <section className="rounded-2xl border border-error-200 bg-white p-6 text-sm text-error-700 dark:border-error-500/30 dark:bg-white/[0.03] dark:text-error-300">
          {errorMessage}
        </section>
      ) : null}

      <section className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Aucune soumission de sujet disponible.
          </div>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                      Sujet
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        item.notificationStatus
                          ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
                          : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300"
                      }`}
                    >
                      {item.notificationStatus ? "traite" : "pending"}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white/90">{item.title}</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Etudiant: <span className="font-medium">{item.student?.displayName ?? "Etudiant"}</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Directeur: <span className="font-medium">{item.director}</span>
                    {item.coDirector ? (
                      <>
                        {" "}
                        | Co-directeur: <span className="font-medium">{item.coDirector}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Soumis le {formatDate(item.createdAt)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/notifications/sujets/${item.id}`}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
                  >
                    Ouvrir le detail
                  </Link>
                  <form action={`/api/admin/notifications/sujets/${item.id}/cover`} method="post" target="_blank">
                    <button
                      type="submit"
                      className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                    >
                      Generer page de garde
                    </button>
                  </form>
                  <form action={`/api/admin/notifications/sujets/${item.id}/protocol`} method="post" target="_blank">
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Voir protocole
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {renderSimpleSections("Thematique", item.thematique)}
                {renderSimpleSections("Justification", item.justification)}
                {renderSimpleSections("Problematique", item.problematique)}
                {renderSimpleSections("Objectif", item.objectif)}
                {renderStructuredSections("Methodologie", item.methodologie)}
                {renderStructuredSections("Resultats attendus", item.resultatsAttendus)}
                {renderStructuredSections("Chronogrammes", item.chronogrammes)}
                {renderStructuredSections("References", item.references)}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
