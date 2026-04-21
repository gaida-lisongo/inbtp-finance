"use client";

import React, { useState } from "react";

import AdminNotificationsRealtimeSync from "@/components/header/AdminNotificationsRealtimeSync";
import TeacherNotificationsRealtimeSync from "@/components/header/TeacherNotificationsRealtimeSync";
import type { AuthenticatedUser } from "@/lib/utils/supabase/session";
import type { AdminDashboardNotificationItem, Notification } from "@/lib/utils/supabase/admin-notifications";
import type { TeacherRecoursNotificationItem } from "@/lib/utils/supabase/teacher-notifications";

import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import NotificationCard from "../notification/NotificationCard";

type NotificationDropdownProps = {
  user: AuthenticatedUser;
  teacherItems: TeacherRecoursNotificationItem[];
  adminItems: AdminDashboardNotificationItem[];
  pendingCount: number;
};
export default function NotificationDropdown({notifcations, user}: {notifcations: Notification[], user: AuthenticatedUser}) {
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen((current) => !current);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const isTeacher = user.activePersona === "teacher";
  const isAdmin = user.activePersona === "admin";
  const hasPendingItems = notifcations?.length > 0;

  return (
    <div className="relative">
      {isTeacher ? <TeacherNotificationsRealtimeSync /> : null}
      {isAdmin ? <AdminNotificationsRealtimeSync /> : null}
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            !hasPendingItems ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notification</h5>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {notifcations.length} en attente
          </span>
        </div>

        <ul className="flex h-auto flex-col overflow-y-auto custom-scrollbar">
          {notifcations.length > 0 ? (
            notifcations.map((notifcation: Notification) => (
              <NotificationCard 
                key={notifcation.id}
                item={notifcation}
                compact={true}
              />
            ))
          ) : (
            <li className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Aucune notification disponible pour ce profil.
            </li>
          )}
        </ul>

        {isAdmin ? (
          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
            <a
              href="/notifications"
              onClick={closeDropdown}
              className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
            >
              Voir toutes les notifications
            </a>
          </div>
        ) : null}
      </Dropdown>
    </div>
  );
}
