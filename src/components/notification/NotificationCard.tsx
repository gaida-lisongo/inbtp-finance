import Link from "next/link";
import { formatDate } from "../education/faculty-dashboard/utils";
import {
  deleteNotification,
  Notification,
  updateNotification,
} from "@/lib/utils/supabase/admin-notifications";

export interface NotificationCardProps {
  item: Notification;
  actionLabel?: string;
  compact?: boolean;
  onDelete?: () => void;
  onUpdateStatus?: (data: any) => void;
}

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(diffInSeconds);
  const formatter = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

  if (absoluteSeconds < 60) {
    return formatter.format(diffInSeconds, "second");
  }

  const diffInMinutes = Math.round(diffInSeconds / 60);

  if (Math.abs(diffInMinutes) < 60) {
    return formatter.format(diffInMinutes, "minute");
  }

  const diffInHours = Math.round(diffInMinutes / 60);

  if (Math.abs(diffInHours) < 24) {
    return formatter.format(diffInHours, "hour");
  }

  const diffInDays = Math.round(diffInHours / 24);
  return formatter.format(diffInDays, "day");
};

const getStatusLabel = (value: boolean | null) => (value === true ? "Traite" : "En attente");


export default function NotificationCard({
  item,
  actionLabel = "Ouvrir",
  compact = false,
  onDelete,
  onUpdateStatus,
}: NotificationCardProps) {
  const actionHref = () => {
    switch (item.categorie) {
      case "notification_paiement":
        return `/notifications/paiements/${item.id}`;
      case "notification_sujet":
        return `/notifications/sujets/${item.id}`;
      case "notification_releve":
        return `/notifications/releves/${item.id}`;
      case "notification_stage":
        return `/notifications/stages/${item.id}`;
      default:
        return "#";
    }
  };

  const handleUpdateNotificationStatus = async () => {
    try {
      const payload = {
        key: "status",
        value: true,
      };
      const data = await updateNotification(item.categorie, item.id, payload);
      if (data) onUpdateStatus?.(data);
    } catch (error) {
      console.log("Error updating notification status:", error);
    }
  };

  const handleDeleteNotification = async () => {
    try {
      const data = await deleteNotification(item.categorie, item.id);
      if (data) onDelete?.();
    } catch (error) {
      console.log("Error deleting notification:", error);
    }
  };

  return (
    <article className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-white/5">
      
      <div className="flex gap-4">
        
        {/* 📸 Avatar */}
        <img
          src={item.students?.photo || "/images/avatar/default.png"}
          alt="student"
          className="h-12 w-12 rounded-full object-cover border"
        />

        {/* 📄 Content */}
        <div className="flex-1">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                {item.object || "Notification"}
              </h3>
              <p className="text-xs text-gray-500">
                {item.students?.nom} {item.students?.post_nom}{" "}
                {item.students?.prenom}
              </p>
            </div>

            <span className="text-xs text-gray-400">
              {formatDate(item.created_at)}
            </span>
          </div>

          {/* Description */}
          {item.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {item.description}
            </p>
          )}

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
            
            {/* Status */}
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                item.status
                  ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300"
              }`}
            >
              {item.status ? "Traité" : "En attente"}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-3">
              
              {/* Voir */}
              <Link
                href={actionHref()}
                className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
              >
                {!compact ? "Voir" : actionLabel}
              </Link>
              {
                !compact ? (
                <>
                    <button
                    onClick={handleUpdateNotificationStatus}
                    className="text-sm text-green-600 hover:underline"
                    >
                    Valider
                    </button>

                    <button
                        onClick={handleDeleteNotification}
                        className="text-sm text-red-600 hover:underline"
                    >
                        Supprimer
                    </button>
                </>
                ) : null
              }
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}