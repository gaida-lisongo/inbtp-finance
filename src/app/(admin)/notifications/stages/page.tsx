import Link from "next/link";
import { redirect } from "next/navigation";

import { getStageRequestNotifications } from "@/lib/utils/supabase/stage-notifications";

const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default async function StageNotificationsPage() {
  let items: Awaited<ReturnType<typeof getStageRequestNotifications>> = [];
  let errorMessage: string | null = null;

  try {
    items = await getStageRequestNotifications();
  } catch (error) {
    if (error instanceof Error && error.message === "access_denied") {
      redirect("/signin?error=access_denied");
    }

    errorMessage = error instanceof Error ? error.message : "Erreur de chargement des notifications stage.";
  }

  const pendingCount = items.filter((item) => item.delivered === "pending").length;
  const successCount = items.filter((item) => item.delivered === "success").length;

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Notifications stages</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">Demandes de lettres de stage</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Cette page est reservee aux organisateurs pour traiter les demandes et generer les lettres officielles.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500">Total</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-warning-700 dark:text-warning-300">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500">Success</p>
          <p className="mt-2 text-2xl font-semibold text-success-700 dark:text-success-300">{successCount}</p>
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
            Aucune demande de stage disponible.
          </div>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                      {item.stageTitle}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        item.delivered === "success"
                          ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
                          : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300"
                      }`}
                    >
                      {item.delivered}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">{item.student?.displayName ?? "Etudiant"}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {item.recipientName} - {item.recipientQuality} - {item.companyName} ({item.companyLocation})
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Demande du {formatDate(item.createdAt)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/notifications/stages/${item.id}`}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
                  >
                    Ouvrir le detail
                  </Link>
                  <form action={`/api/admin/notifications/stages/${item.id}/letter`} method="post" target="_blank">
                    <button
                      type="submit"
                      className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                    >
                      Generer la lettre
                    </button>
                  </form>
                  <Link
                    href={`/commande/order/${encodeURIComponent(item.documentReference ?? item.notificationId)}`}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
                  >
                    Voir commande
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
