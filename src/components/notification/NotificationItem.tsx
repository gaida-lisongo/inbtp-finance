"use client";

import type { Notification } from "@/lib/utils/supabase/admin-notifications";

type NotificationItemProps = {
  item: Notification;
  onClick?: () => void;
};

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

const getStudentLabel = (item: Notification) => {
  const parts = [item.students?.nom, item.students?.post_nom, item.students?.prenom]
    .map((value) => value?.trim())
    .filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return item.students?.email?.trim() || "Notification systeme";
};

export default function NotificationItem({ item, onClick }: NotificationItemProps) {
  const isPending = item.status !== true;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-white/5"
    >
      <div className="relative shrink-0">
        <img
          src={item.students?.photo || "/images/inbtp/logo_inbtp.jpg"}
          alt={getStudentLabel(item)}
          className="h-11 w-11 rounded-full border border-gray-200 object-cover dark:border-gray-700"
        />
        {isPending ? (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-500 dark:border-gray-900" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
              {item.object || "Notification"}
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-gray-500 dark:text-gray-400">{getStudentLabel(item)}</p>
          </div>
          <span className={`shrink-0 text-[11px] font-medium ${isPending ? "text-brand-600 dark:text-brand-300" : "text-gray-400 dark:text-gray-500"}`}>
            {formatRelativeTime(item.created_at)}
          </span>
        </div>

        {item.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-600 dark:text-gray-300">{item.description}</p>
        ) : null}

        <div className="mt-2 flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isPending
                ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                : "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300"
            }`}
          >
            {isPending ? "Nouveau" : "Traite"}
          </span>
        </div>
      </div>
    </button>
  );
}
