import Link from "next/link";
import { redirect } from "next/navigation";

import { getSubjectRequestNotificationById } from "@/lib/utils/supabase/sujet-notifications";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const renderSimpleSections = (label: string, sections: string[]) => (
  <div className="space-y-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
    <h4 className="text-sm font-semibold text-gray-900 dark:text-white/90">{label}</h4>
    {sections.length === 0 ? (
      <p className="text-sm text-gray-500 dark:text-gray-400">Aucune section renseignee.</p>
    ) : (
      <div className="space-y-2">
        {sections.map((section, index) => (
          <pre key={`${label}-${index}`} className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-200">
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

export default async function SubjectNotificationDetailPage({
  params,
}: {
  params: Promise<{ notification_sujet_id: string }>;
}) {
  const { notification_sujet_id: notificationSujetId } = await params;
  let item: Awaited<ReturnType<typeof getSubjectRequestNotificationById>> = null;

  try {
    item = await getSubjectRequestNotificationById(notificationSujetId);
  } catch (error) {
    if (error instanceof Error && error.message === "access_denied") {
      redirect("/signin?error=access_denied");
    }

    return (
      <main className="rounded-2xl border border-error-200 bg-white p-6 text-sm text-error-700 dark:border-error-500/30 dark:bg-white/[0.03] dark:text-error-300">
        {error instanceof Error ? error.message : "Erreur de chargement de la notification sujet."}
      </main>
    );
  }

  if (!item) {
    return (
      <main className="rounded-2xl border border-error-200 bg-white p-6 text-sm text-error-700 dark:border-error-500/30 dark:bg-white/[0.03] dark:text-error-300">
        Notification sujet introuvable.
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Detail notification sujet</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">{item.title}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Soumis le {formatDate(item.createdAt)}</p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
          <span>Etudiant: {item.student?.displayName ?? "Etudiant"}</span>
          <span>Directeur: {item.director}</span>
          {item.coDirector ? <span>Co-directeur: {item.coDirector}</span> : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <form action={`/api/admin/notifications/sujets/${item.id}/cover`} method="post" target="_blank">
            <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              Generer page de garde
            </button>
          </form>
          <Link
            href="/notifications/sujets"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            Retour liste sujets
          </Link>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {renderSimpleSections("Thematique", item.thematique)}
          {renderSimpleSections("Justification", item.justification)}
          {renderSimpleSections("Problematique", item.problematique)}
          {renderSimpleSections("Objectif", item.objectif)}
          {renderStructuredSections("Methodologie", item.methodologie)}
          {renderStructuredSections("Resultats attendus", item.resultatsAttendus)}
          {renderStructuredSections("Chronogrammes", item.chronogrammes)}
          {renderStructuredSections("References", item.references)}
        </div>
      </section>
    </main>
  );
}
