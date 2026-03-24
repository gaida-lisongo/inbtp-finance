"use client";

import { createClient as createBrowserSupabaseClient } from "@/lib/utils/supabase/client";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

type UserDropdownState = {
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
};

const defaultUserState: UserDropdownState = {
  email: null,
  displayName: "Utilisateur",
  avatarUrl: null,
};

const menuItemClassName =
  "flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300";

const menuIconClassName =
  "h-5 w-5 text-gray-500 transition-colors group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300";

const getDisplayName = (email: string | null, metadata?: Record<string, unknown>) => {
  const fullName = metadata?.full_name;
  const name = metadata?.name;

  if (typeof fullName === "string" && fullName.trim()) {
    return fullName;
  }

  if (typeof name === "string" && name.trim()) {
    return name;
  }

  return email ?? "Utilisateur";
};

const getAvatarUrl = (metadata?: Record<string, unknown>) => {
  const avatarUrl = metadata?.avatar_url;
  const picture = metadata?.picture;

  if (typeof avatarUrl === "string" && avatarUrl.trim()) {
    return avatarUrl;
  }

  if (typeof picture === "string" && picture.trim()) {
    return picture;
  }

  return null;
};

const ProfileIcon = () => (
  <svg
    className={menuIconClassName}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 10.625C12.0711 10.625 13.75 8.94607 13.75 6.875C13.75 4.80393 12.0711 3.125 10 3.125C7.92893 3.125 6.25 4.80393 6.25 6.875C6.25 8.94607 7.92893 10.625 10 10.625Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M3.75 16.25C4.73452 14.2234 6.96303 12.8125 10 12.8125C13.037 12.8125 15.2655 14.2234 16.25 16.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    className={menuIconClassName}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.25 1.875V4.375M13.75 1.875V4.375M3.125 7.5H16.875M5.625 3.125H14.375C15.7557 3.125 16.875 4.24429 16.875 5.625V14.375C16.875 15.7557 15.7557 16.875 14.375 16.875H5.625C4.24429 16.875 3.125 15.7557 3.125 14.375V5.625C3.125 4.24429 4.24429 3.125 5.625 3.125Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GraduationIcon = () => (
  <svg
    className={menuIconClassName}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.5 7.5L10 3.75L17.5 7.5L10 11.25L2.5 7.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M5.625 9.0625V12.5C5.625 13.8807 7.58401 15 10 15C12.416 15 14.375 13.8807 14.375 12.5V9.0625"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17.5 7.5V11.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const StudentsIcon = () => (
  <svg
    className={menuIconClassName}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M7.1875 9.375C8.39612 9.375 9.375 8.39612 9.375 7.1875C9.375 5.97888 8.39612 5 7.1875 5C5.97888 5 5 5.97888 5 7.1875C5 8.39612 5.97888 9.375 7.1875 9.375Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M12.8125 10.625C13.848 10.625 14.6875 9.78553 14.6875 8.75C14.6875 7.71447 13.848 6.875 12.8125 6.875"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M3.75 14.375C4.45822 12.9924 5.82695 12.1875 7.5 12.1875C9.17305 12.1875 10.5418 12.9924 11.25 14.375"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M11.875 13.125C12.3427 12.7988 12.9176 12.6042 13.5417 12.6042C14.7594 12.6042 15.7899 13.3457 16.25 14.375"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const LogoutIcon = () => (
  <svg
    className={menuIconClassName}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12.5 5.625L16.875 10L12.5 14.375"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 10H16.5625"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M8.125 16.25H6.875C5.49429 16.25 4.375 15.1307 4.375 13.75V6.25C4.375 4.86929 5.49429 3.75 6.875 3.75H8.125"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const menuItems = [
  { href: "/profile", label: "Profil", icon: <ProfileIcon /> },
  { href: "/annees", label: "Annees", icon: <CalendarIcon /> },
  { href: "/promotions", label: "Promotions", icon: <GraduationIcon /> },
  { href: "/etudiants", label: "Etudiants", icon: <StudentsIcon /> },
];

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [userState, setUserState] = useState<UserDropdownState>(defaultUserState);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const syncUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserState(defaultUserState);
        return;
      }

      const metadata = user.user_metadata as Record<string, unknown> | undefined;

      setUserState({
        email: user.email ?? null,
        displayName: getDisplayName(user.email ?? null, metadata),
        avatarUrl: getAvatarUrl(metadata),
      });
    };

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const avatarSrc = useMemo(
    () => userState.avatarUrl ?? "/images/user/owner.jpg",
    [userState.avatarUrl],
  );

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dark:text-gray-400 dropdown-toggle"
      >
        <span className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarSrc}
            alt={userState.displayName}
            className="h-full w-full object-cover"
          />
        </span>

        <span className="mr-1 block font-medium text-theme-sm">
          {userState.displayName}
        </span>

        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div>
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            {userState.displayName}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {userState.email ?? "Aucune session active"}
          </span>
        </div>

        <ul className="flex flex-col gap-1 border-b border-gray-200 pt-4 pb-3 dark:border-gray-800">
          {menuItems.map((item) => (
            <li key={item.label}>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href={item.href}
                className={menuItemClassName}
              >
                {item.icon}
                {item.label}
              </DropdownItem>
            </li>
          ))}
        </ul>

        <Link
          href="/api/logout"
          onClick={closeDropdown}
          className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          <LogoutIcon />
          Deconnexion
        </Link>
      </Dropdown>
    </div>
  );
}
