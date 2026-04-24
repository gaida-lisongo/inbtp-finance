"use client";

import React, { useState } from "react";

import type { Notification } from "@/lib/utils/supabase/admin-notifications";

import { Dropdown } from "../ui/dropdown/Dropdown";
import NotificationItem from "../notification/NotificationItem";
import { useRouter } from "next/navigation";
import SchemaRealtimeSync from "../common/TableReatimeSync";
import { AccountType } from "@/store/useUserStore";

const teacherTables = ["notification_recours"];
const gestionnaireTables = ["notification_payment"];
const organisateurTables = ["notification_stage", "notification_sujet", "notification_releve"];

export default function NotificationDropdown({
  notifcations,
  accountType,
  onNotificationsChange,
}: {
  notifcations: Notification[];
  accountType: AccountType;
  onNotificationsChange: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  function toggleDropdown() {
    setIsOpen((current) => !current);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const isTeacher = accountType === "titulaire";
  const isOrganisateur = accountType === "organisateur";
  const isGestionnaire = accountType === "gestionnaire";
  const pendingCount = notifcations.filter((item) => item.status !== true).length;
  const hasPendingItems = pendingCount > 0;

  return (
    <div className="relative">
      {isTeacher ? <SchemaRealtimeSync tables={teacherTables} onChange={onNotificationsChange} /> : null}
      {isGestionnaire ? <SchemaRealtimeSync tables={gestionnaireTables} onChange={onNotificationsChange} /> : null}
      {isOrganisateur ? <SchemaRealtimeSync tables={organisateurTables} onChange={onNotificationsChange} /> : null}
      
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
        className="absolute -right-[240px] mt-[17px] flex h-[540px] w-[380px] flex-col rounded-3xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[400px] lg:right-0"
      >
        <div className="mb-2 flex items-center justify-between border-b border-gray-100 px-3 pb-3 pt-2 dark:border-gray-700">
          <div>
            <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notifications</h5>
            <p className="text-xs text-gray-500 dark:text-gray-400">Centre de suivi en temps reel</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {pendingCount} en attente
          </span>
        </div>

        <ul className="flex h-auto flex-col gap-1 overflow-y-auto px-1 pb-1 custom-scrollbar">
          {notifcations.length > 0 ? (
            notifcations.map((notifcation: Notification) => (
              <li key={notifcation.id}>
                <NotificationItem
                  item={notifcation}
                  onClick={() => {
                    closeDropdown();
                    const path = notifcation.categorie.split("_");
                    router.push(`/${path[0]}/${path[1]}/${notifcation.id}`);
                  }}
                />
              </li>
            ))
          ) : (
            <li className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Aucune notification disponible pour ce profil.
            </li>
          )}
        </ul>
        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <a
            href={`/notifications`}
            onClick={closeDropdown}
            className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
          >
            Voir toutes les notifications
          </a>
        </div>
      </Dropdown>
    </div>
  );
}
