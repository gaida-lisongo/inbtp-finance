import Link from "next/link";
import { redirect } from "next/navigation";

import SubjectEvaluationPanel from "@/components/recherche/SubjectEvaluationPanel";
import { getSubjectRequestNotificationById } from "@/lib/utils/supabase/sujet-notifications";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

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
          <form action={`/api/admin/notifications/sujets/${item.id}/protocol`} method="post" target="_blank">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Voir protocole de recherche
            </button>
          </form>
          <Link
            href="/notifications/sujets"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            Retour liste sujets
          </Link>
        </div>
      </section>

      <SubjectEvaluationPanel item={item} />
    </main>
  );
}
