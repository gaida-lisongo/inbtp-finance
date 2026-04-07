import Link from "next/link";
import { redirect } from "next/navigation";

import { getStageRequestNotificationById } from "@/lib/utils/supabase/stage-notifications";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default async function StageNotificationDetailPage({
  params,
}: {
  params: Promise<{ notification_stage_id: string }>;
}) {
  const { notification_stage_id: notificationStageIdParam } = await params;
  const notificationStageId = Number.parseInt(notificationStageIdParam, 10);

  if (!Number.isFinite(notificationStageId)) {
    return (
      <main className="rounded-2xl border border-error-200 bg-white p-6 text-sm text-error-700 dark:border-error-500/30 dark:bg-white/[0.03] dark:text-error-300">
        Identifiant de notification stage invalide.
      </main>
    );
  }

  let item: Awaited<ReturnType<typeof getStageRequestNotificationById>> = null;

  try {
    item = await getStageRequestNotificationById(notificationStageId);
  } catch (error) {
    if (error instanceof Error && error.message === "access_denied") {
      redirect("/signin?error=access_denied");
    }

    return (
      <main className="rounded-2xl border border-error-200 bg-white p-6 text-sm text-error-700 dark:border-error-500/30 dark:bg-white/[0.03] dark:text-error-300">
        {error instanceof Error ? error.message : "Erreur de chargement de la notification stage."}
      </main>
    );
  }

  if (!item) {
    return (
      <main className="rounded-2xl border border-error-200 bg-white p-6 text-sm text-error-700 dark:border-error-500/30 dark:bg-white/[0.03] dark:text-error-300">
        Notification stage introuvable.
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Detail notification stage</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">{item.stageTitle}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Soumise le {formatDate(item.createdAt)}</p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="grid gap-3 text-sm text-gray-700 dark:text-gray-200">
          <p>Etudiant: {item.student?.displayName ?? "Etudiant"}</p>
          <p>Destinataire: {item.recipientName}</p>
          <p>Qualite: {item.recipientQuality}</p>
          <p>Entreprise: {item.companyName}</p>
          <p>Lieu: {item.companyLocation}</p>
          <p>Statut: {item.delivered}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <form action={`/api/admin/notifications/stages/${item.id}/letter`} method="post" target="_blank">
            <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              Generer la lettre
            </button>
          </form>
          <Link
            href={`/commande/order/${encodeURIComponent(item.documentReference ?? item.notificationId)}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            Voir commande
          </Link>
          <Link
            href="/notifications/stages"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            Retour liste stages
          </Link>
        </div>
      </section>
    </main>
  );
}
