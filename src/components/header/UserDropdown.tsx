/* eslint-disable @next/next/no-img-element */

"use client";

import React, { useMemo, useState } from "react";

import AvatarText from "@/components/ui/avatar/AvatarText";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import type { AuthenticatedUser } from "@/lib/utils/supabase/session";
import Authentication from "@/lib/user/Authentication";
import { useRouter } from "next/navigation";

type UserDropdownProps = {
  user: AuthenticatedUser;
};

export default function UserDropdown({ user }: UserDropdownProps) {
  console.log("user From  Layout : ", user)
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const signOutAction = async () => {
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dark:text-gray-400 dropdown-toggle"
      >
        <span className="mr-3 overflow-hidden rounded-full">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-11 w-11 rounded-full object-cover"
            />
          ) : (
            <AvatarText name={user.name} className="h-11 w-11 text-sm" />
          )}
        </span>

        <span className="mr-1 hidden text-right sm:block">
          <span className="block font-medium text-theme-sm text-gray-800 dark:text-white/90">
            {user.name}
          </span>
          <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </span>
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
        className="absolute right-0 mt-[17px] flex w-[280px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="border-b border-gray-200 pb-3 dark:border-gray-800">
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-200">
            {user.name}
          </span>
          <span className="mt-0.5 block break-all text-theme-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </span>
        </div>

        <ul className="flex flex-col gap-1 py-3 border-b border-gray-200 dark:border-gray-800">
          {user.canManageYears ? (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href="/annees"
                className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                <svg
                  className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M7.75 2C6.7835 2 6 2.7835 6 3.75V4H5.25C3.73122 4 2.5 5.23122 2.5 6.75V18.75C2.5 20.2688 3.73122 21.5 5.25 21.5H18.75C20.2688 21.5 21.5 20.2688 21.5 18.75V6.75C21.5 5.23122 20.2688 4 18.75 4H18V3.75C18 2.7835 17.2165 2 16.25 2C15.2835 2 14.5 2.7835 14.5 3.75V4H9.5V3.75C9.5 2.7835 8.7165 2 7.75 2ZM8 5.5H16V4.5H8V5.5ZM5.25 5.5C4.55964 5.5 4 6.05964 4 6.75V8H20V6.75C20 6.05964 19.4404 5.5 18.75 5.5H17.5V5.75C17.5 6.16421 17.1642 6.5 16.75 6.5C16.3358 6.5 16 6.16421 16 5.75V5.5H8V5.75C8 6.16421 7.66421 6.5 7.25 6.5C6.83579 6.5 6.5 6.16421 6.5 5.75V5.5H5.25ZM20 9.5H4V18.75C4 19.4404 4.55964 20 5.25 20H18.75C19.4404 20 20 19.4404 20 18.75V9.5Z"
                    fill=""
                  />
                </svg>
                Annees
              </DropdownItem>
            </li>
          ) : null}

          {user.canManageAuthorizations ? (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href="/autorisations"
                className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                <svg
                  className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C9.65279 2 7.75 3.90279 7.75 6.25C7.75 8.59721 9.65279 10.5 12 10.5C14.3472 10.5 16.25 8.59721 16.25 6.25C16.25 3.90279 14.3472 2 12 2ZM9.25 6.25C9.25 4.73122 10.4812 3.5 12 3.5C13.5188 3.5 14.75 4.73122 14.75 6.25C14.75 7.76878 13.5188 9 12 9C10.4812 9 9.25 7.76878 9.25 6.25ZM6.25736 13.4514C7.84291 12.4835 9.89538 12 12 12C14.1046 12 16.1571 12.4835 17.7426 13.4514C19.3053 14.4053 20.5 15.9018 20.5 17.75V18.5C20.5 19.8807 19.3807 21 18 21H6C4.61929 21 3.5 19.8807 3.5 18.5V17.75C3.5 15.9018 4.69472 14.4053 6.25736 13.4514ZM5 17.75C5 16.5627 5.75729 15.4877 7.03897 14.7053C8.29825 13.9365 10.0102 13.5 12 13.5C13.9898 13.5 15.7018 13.9365 16.961 14.7053C18.2427 15.4877 19 16.5627 19 17.75V18.5C19 19.0523 18.5523 19.5 18 19.5H6C5.44771 19.5 5 19.0523 5 18.5V17.75Z"
                    fill=""
                  />
                </svg>
                Autorisations
              </DropdownItem>
            </li>
          ) : null}

          {user.canManageFiliere ? (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href="/filieres"
                className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                <svg
                  className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M7.75 2C6.7835 2 6 2.7835 6 3.75V4H5.25C3.73122 4 2.5 5.23122 2.5 6.75V18.75C2.5 20.2688 3.73122 21.5 5.25 21.5H18.75C20.2688 21.5 21.5 20.2688 21.5 18.75V6.75C21.5 5.23122 20.2688 4 18.75 4H18V3.75C18 2.7835 17.2165 2 16.25 2C15.2835 2 14.5 2.7835 14.5 3.75V4H9.5V3.75C9.5 2.7835 8.7165 2 7.75 2ZM8 5.5H16V4.5H8V5.5ZM5.25 5.5C4.55964 5.5 4 6.05964 4 6.75V8H20V6.75C20 6.05964 19.4404 5.5 18.75 5.5H17.5V5.75C17.5 6.16421 17.1642 6.5 16.75 6.5C16.3358 6.5 16 6.16421 16 5.75V5.5H8V5.75C8 6.16421 7.66421 6.5 7.25 6.5C6.83579 6.5 6.5 6.16421 6.5 5.75V5.5H5.25ZM20 9.5H4V18.75C4 19.4404 4.55964 20 5.25 20H18.75C19.4404 20 20 19.4404 20 18.75V9.5Z"
                    fill=""
                  />
                </svg>
                Filieres
              </DropdownItem>
            </li>
          ) : null}

          {user.canManageProgramme ? (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href="/programmes"
                className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                <svg
                  className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C9.65279 2 7.75 3.90279 7.75 6.25C7.75 8.59721 9.65279 10.5 12 10.5C14.3472 10.5 16.25 8.59721 16.25 6.25C16.25 3.90279 14.3472 2 12 2ZM9.25 6.25C9.25 4.73122 10.4812 3.5 12 3.5C13.5188 3.5 14.75 4.73122 14.75 6.25C14.75 7.76878 13.5188 9 12 9C10.4812 9 9.25 7.76878 9.25 6.25ZM6.25736 13.4514C7.84291 12.4835 9.89538 12 12 12C14.1046 12 16.1571 12.4835 17.7426 13.4514C19.3053 14.4053 20.5 15.9018 20.5 17.75V18.5C20.5 19.8807 19.3807 21 18 21H6C4.61929 21 3.5 19.8807 3.5 18.5V17.75C3.5 15.9018 4.69472 14.4053 6.25736 13.4514ZM5 17.75C5 16.5627 5.75729 15.4877 7.03897 14.7053C8.29825 13.9365 10.0102 13.5 12 13.5C13.9898 13.5 15.7018 13.9365 16.961 14.7053C18.2427 15.4877 19 16.5627 19 17.75V18.5C19 19.0523 18.5523 19.5 18 19.5H6C5.44771 19.5 5 19.0523 5 18.5V17.75Z"
                    fill=""
                  />
                </svg>
                Programmes
              </DropdownItem>
            </li>
          ) : null}

          {user.role === "organisateur" ? (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href="/agents"
                className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                <svg
                  className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM5 12C5 8.13401 8.13401 5 12 5C15.866 5 19 8.13401 19 12C19 13.3777 18.5355 14.6497 17.7417 15.6703C17.4027 14.0197 15.8649 12.8455 13.9746 12.8455H10.0246C8.13427 12.8455 6.59647 14.0197 6.25747 15.6703C5.46351 14.6497 5 13.3777 5 12ZM10.7246 15.3455C9.89538 15.3455 9.22461 16.0163 9.22461 16.8455V16.856C10.1198 17.3898 11.0291 17.75 12 17.75C12.9705 17.75 13.8798 17.3898 14.7746 16.856V16.8455C14.7746 16.0163 14.1038 15.3455 13.2746 15.3455H10.7246ZM12 7.25C10.4812 7.25 9.25 8.48122 9.25 10C9.25 11.5188 10.4812 12.75 12 12.75C13.5188 12.75 14.75 11.5188 14.75 10C14.75 8.48122 13.5188 7.25 12 7.25ZM10.75 10C10.75 9.30964 11.3096 8.75 12 8.75C12.6904 8.75 13.25 9.30964 13.25 10C13.25 10.6904 12.6904 11.25 12 11.25C11.3096 11.25 10.75 10.6904 10.75 10Z"
                    fill=""
                  />
                </svg>
                Agents
              </DropdownItem>
            </li>
          ) : null}

          {user.role === "gestionnaire" ? (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href="/etudiants"
                className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                <svg
                  className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M7.5 7.25C7.5 4.90279 9.40279 3 11.75 3C14.0972 3 16 4.90279 16 7.25C16 9.59721 14.0972 11.5 11.75 11.5C9.40279 11.5 7.5 9.59721 7.5 7.25ZM11.75 4.5C10.2312 4.5 9 5.73122 9 7.25C9 8.76878 10.2312 10 11.75 10C13.2688 10 14.5 8.76878 14.5 7.25C14.5 5.73122 13.2688 4.5 11.75 4.5ZM5.25 18C5.25 15.3766 7.37665 13.25 10 13.25H13.5C16.1234 13.25 18.25 15.3766 18.25 18V18.5C18.25 18.9142 17.9142 19.25 17.5 19.25C17.0858 19.25 16.75 18.9142 16.75 18.5V18C16.75 16.2051 15.2949 14.75 13.5 14.75H10C8.20507 14.75 6.75 16.2051 6.75 18V18.5C6.75 18.9142 6.41421 19.25 6 19.25C5.58579 19.25 5.25 18.9142 5.25 18.5V18ZM18.25 8.25C18.25 7.83579 18.5858 7.5 19 7.5C20.2426 7.5 21.25 8.50736 21.25 9.75C21.25 10.9926 20.2426 12 19 12C18.5858 12 18.25 11.6642 18.25 11.25C18.25 10.8358 18.5858 10.5 19 10.5C19.4142 10.5 19.75 10.1642 19.75 9.75C19.75 9.33579 19.4142 9 19 9C18.5858 9 18.25 8.66421 18.25 8.25Z"
                    fill=""
                  />
                </svg>
                Etudiants
              </DropdownItem>
            </li>
          ) : null}

          {user.activePersona === "student" ? (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href="/ressources"
                className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                <svg
                  className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4 5.5C4 4.67157 4.67157 4 5.5 4H18.5C19.3284 4 20 4.67157 20 5.5V18.5C20 19.3284 19.3284 20 18.5 20H5.5C4.67157 20 4 19.3284 4 18.5V5.5ZM5.5 5.5H18.5V8.5H5.5V5.5ZM5.5 10V18.5H18.5V10H5.5ZM7.5 12.25C7.08579 12.25 6.75 12.5858 6.75 13C6.75 13.4142 7.08579 13.75 7.5 13.75H16.5C16.9142 13.75 17.25 13.4142 17.25 13C17.25 12.5858 16.9142 12.25 16.5 12.25H7.5ZM7.5 15.25C7.08579 15.25 6.75 15.5858 6.75 16C6.75 16.4142 7.08579 16.75 7.5 16.75H12.5C12.9142 16.75 13.25 16.4142 13.25 16C13.25 15.5858 12.9142 15.25 12.5 15.25H7.5Z"
                    fill=""
                  />
                </svg>
                Mes ressources
              </DropdownItem>
            </li>
          ) : null}
        {
          user.activePersona !== "student" ? (
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <svg
                className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM17.0246 18.8566V18.8455C17.0246 16.7744 15.3457 15.0955 13.2746 15.0955H10.7246C8.65354 15.0955 6.97461 16.7744 6.97461 18.8455V18.856C8.38223 19.8895 10.1198 20.5 12 20.5C13.8798 20.5 15.6171 19.8898 17.0246 18.8566ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9991 7.25C10.8847 7.25 9.98126 8.15342 9.98126 9.26784C9.98126 10.3823 10.8847 11.2857 11.9991 11.2857C13.1135 11.2857 14.0169 10.3823 14.0169 9.26784C14.0169 8.15342 13.1135 7.25 11.9991 7.25ZM8.48126 9.26784C8.48126 7.32499 10.0563 5.75 11.9991 5.75C13.9419 5.75 15.5169 7.32499 15.5169 9.26784C15.5169 11.2107 13.9419 12.7857 11.9991 12.7857C10.0563 12.7857 8.48126 11.2107 8.48126 9.26784Z"
                  fill=""
                />
              </svg>
              Mon profil
            </DropdownItem>
          </li>

          ) : null
        }

          {user.role === "organisateur" || user.role === "titulaire" ? (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href="/jury"
                className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                <svg
                  className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V9H4V5ZM4 11H20V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V11ZM6 13V17H18V13H6Z"
                    fill=""
                  />
                </svg>
                Jury
              </DropdownItem>
            </li>
          ) : null}

          {user.role === "titulaire" ? (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href="/enseignant/retraits"
                className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                <svg
                  className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M11.1173 2.75C8.1143 2.75 5.68007 5.18423 5.68007 8.18725V10.4508H4.375C3.61561 10.4508 3 11.0664 3 11.8258V18.5C3 19.8807 4.11929 21 5.5 21H18.5C19.8807 21 21 19.8807 21 18.5V11.8258C21 11.0664 20.3844 10.4508 19.625 10.4508H18.3199V8.18725C18.3199 5.18423 15.8857 2.75 12.8827 2.75H11.1173ZM16.8199 10.4508V8.18725C16.8199 6.01265 15.0573 4.25 12.8827 4.25H11.1173C8.94273 4.25 7.18007 6.01265 7.18007 8.18725V10.4508H16.8199ZM12 13.25C12.4142 13.25 12.75 13.5858 12.75 14V16.25C12.75 16.6642 12.4142 17 12 17C11.5858 17 11.25 16.6642 11.25 16.25V14C11.25 13.5858 11.5858 13.25 12 13.25Z"
                    fill=""
                  />
                </svg>
                Retrait
              </DropdownItem>
            </li>
          ) : null}
        </ul>

        <form action={signOutAction} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            <svg
              className="fill-gray-500 group-hover:fill-gray-700 dark:group-hover:fill-gray-300"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.1007 19.247C14.6865 19.247 14.3507 18.9112 14.3507 18.497L14.3507 14.245H12.8507V18.497C12.8507 19.7396 13.8581 20.747 15.1007 20.747H18.5007C19.7434 20.747 20.7507 19.7396 20.7507 18.497L20.7507 5.49609C20.7507 4.25345 19.7433 3.24609 18.5007 3.24609H15.1007C13.8581 3.24609 12.8507 4.25345 12.8507 5.49609V9.74501L14.3507 9.74501V5.49609C14.3507 5.08188 14.6865 4.74609 15.1007 4.74609L18.5007 4.74609C18.9149 4.74609 19.2507 5.08188 19.2507 5.49609L19.2507 18.497C19.2507 18.9112 18.9149 19.247 18.5007 19.247H15.1007ZM3.25073 11.9984C3.25073 12.2144 3.34204 12.4091 3.48817 12.546L8.09483 17.1556C8.38763 17.4485 8.86251 17.4487 9.15549 17.1559C9.44848 16.8631 9.44863 16.3882 9.15583 16.0952L5.81116 12.7484L16.0007 12.7484C16.4149 12.7484 16.7507 12.4127 16.7507 11.9984C16.7507 11.5842 16.4149 11.2484 16.0007 11.2484L5.81528 11.2484L9.15585 7.90554C9.44864 7.61255 9.44847 7.13767 9.15547 6.84488C8.86248 6.55209 8.3876 6.55226 8.09481 6.84525L3.52309 11.4202C3.35673 11.5577 3.25073 11.7657 3.25073 11.9984Z"
                fill=""
              />
            </svg>
            Se déconnecter
          </button>
        </form>
      </Dropdown>
    </div>
  );
}
