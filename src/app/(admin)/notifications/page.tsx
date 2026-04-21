import type { Metadata } from "next";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getNotificationsGestionnaire, getNotificationsOrganisateur, Notification } from "@/lib/utils/supabase/admin-notifications";
import { getCurrentAccountType } from "@/lib/utils/supabase/agents";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import NotificationsClient from "./notifications_client";

export const metadata: Metadata = {
  title: "Notifications | Dashboard Agents",
  description: "Historique des notifications administratives.",
};
export default async function NotificationsPage() {
  const user = await getAuthenticatedUser();
  let errorMessage: string | null = null;
  let notifications: Notification[] = [];
  const accountType = await getCurrentAccountType();

  console.log("Current User auth : ", user)

  try {
    notifications = user?.role == 'gestionnaire'
      ? await getNotificationsGestionnaire(true)
      : user?.role == 'organisateur'
        ? await getNotificationsOrganisateur(true)
        : [];
    
    console.log("Notifications : ", notifications)
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Erreur de chargement des notifications.";
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb 
          detailPage={`Notifications ${accountType ? accountType.toUpperCase() : ""}`} 
          pageTitle={`Notifications`} 
          pageRoot="Dashboard"
          path="/"
       />

      <ComponentCard title="Historique complet">

        {errorMessage ? (
          <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
            {errorMessage}
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Aucune notification disponible.</p>
        ) : (
          <NotificationsClient initialNotifications={notifications} />
        )}
      </ComponentCard>
    </div>
  );
}
