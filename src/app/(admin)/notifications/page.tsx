import Link from "next/link";
import type { Metadata } from "next";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getAdminNotifications } from "@/lib/utils/supabase/admin-notifications";

export const metadata: Metadata = {
  title: "Notifications | Dashboard Agents",
  description: "Historique des notifications administratives.",
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default async function NotificationsPage() {
  let errorMessage: string | null = null;
  let items: Awaited<ReturnType<typeof getAdminNotifications>> = [];

  try {
    items = await getAdminNotifications({ limit: 200 });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Erreur de chargement des notifications.";
  }

  const pendingCount = items.filter((item) => item.status !== true).length;

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Notifications administratives" />

      <ComponentCard title="Historique complet">
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</p>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{items.length}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">En attente</p>
            <p className="mt-2 text-2xl font-semibold text-warning-600 dark:text-warning-300">{pendingCount}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Demande stage</p>
            <Link href="/notifications/stages" className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
              Ouvrir les notifications stage
            </Link>
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Demande sujet</p>
            <Link href="/notifications/sujets" className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
              Ouvrir les notifications sujet
            </Link>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
            {errorMessage}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Aucune notification disponible.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">{item.object || "Notification"}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(item.createdAt)}</span>
                </div>
                {item.description ? <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.description}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <span
                    className={`rounded-full px-2 py-1 ${
                      item.status === true
                        ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
                        : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300"
                    }`}
                  >
                    {item.status === true ? "Traite" : "En attente"}
                  </span>
                  {item.path ? (
                    <Link href={item.path} className="font-medium text-brand-600 hover:underline dark:text-brand-300">
                      Ouvrir
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </ComponentCard>
    </div>
  );
}
