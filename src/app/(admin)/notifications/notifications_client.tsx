"use client";

import { useEffect, useState } from "react";
import { Notification } from "@/lib/utils/supabase/admin-notifications";
import NotificationCard from "@/components/notification/NotificationCard";
import { useRouter } from "next/navigation";

export default function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: Notification[];
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 🔍 Filtrage
  const filteredNotifications = notifications.filter((notification) => {
    const query = search.toLowerCase();

    return (
      notification?.object?.toLowerCase().includes(query) ||
      notification?.description?.toLowerCase().includes(query) ||
      notification?.students?.nom?.toLowerCase().includes(query) ||
      notification?.students?.prenom?.toLowerCase().includes(query) ||
      notification?.students?.post_nom?.toLowerCase().includes(query) ||
      notification?.students?.email?.toLowerCase().includes(query)
    );
  });

  // 🗑 Delete handler
  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // ✅ Update status handler
  const handleUpdateStatus = (updated: Notification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === updated.id ? updated : n))
    );
  };

  return (
    <div className="p-4 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>

        {/* 🔍 Search */}
        <input
          type="text"
          placeholder="Rechercher une notification..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      {/* ⚠️ Error */}
      {errorMessage && (
        <div className="rounded-lg bg-red-100 p-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {/* ⏳ Loading */}
      {isLoading && (
        <div className="text-sm text-gray-500">Chargement...</div>
      )}

      {/* 📭 Empty */}
      {!isLoading && filteredNotifications.length === 0 && (
        <div className="text-center text-sm text-gray-500">
          Aucune notification trouvée
        </div>
      )}

      {/* 📦 List */}
      <div className="space-y-4">
        {filteredNotifications.map((item) => (
          <NotificationCard
            key={item.id}
            item={item}
            onDelete={() => handleDelete(item.id)}
            onUpdateStatus={handleUpdateStatus}
            compact={false}
            onClick={() => {
                const path = item?.categorie.split('_')
                console.log(path)

                //Redirect to Notification Page
                router.push(`/${path[0]}/${path[1]}/${item?.id}`)

            }}
          />
        ))}
      </div>
    </div>
  );
}