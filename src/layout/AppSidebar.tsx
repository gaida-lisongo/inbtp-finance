"use client";

import React, { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { SidebarMenuItem, SidebarMenuSubItem } from "@/lib/navigation/admin-sidebar";
import { useSidebar } from "@/context/SidebarContext";
import { ChevronDownIcon, DocsIcon, GridIcon, GroupIcon, HorizontaLDots, UserCircleIcon } from "@/icons";

type AppSidebarProps = {
  menuItems: SidebarMenuItem[];
};

const iconMap = {
  grid: <GridIcon />,
  folder: <DocsIcon />,
  group: <GroupIcon />,
  user: <UserCircleIcon />,
};

const hasActiveItem = (
  item: SidebarMenuItem | SidebarMenuSubItem,
  isActive: (path: string) => boolean,
): boolean => {
  const currentItemActive = item.path ? isActive(item.path) : false;
  const childItemActive = item.subItems?.some((child) => hasActiveItem(child, isActive)) ?? false;

  return currentItemActive || childItemActive;
};

export default function AppSidebar({ menuItems }: AppSidebarProps) {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const isActive = useCallback((path: string) => pathname === path, [pathname]);

  const itemsWithState = useMemo(
    () =>
      menuItems.map((item) => ({
        ...item,
        isDirectActive: item.path ? isActive(item.path) : false,
        isSubmenuActive: item.subItems?.some((subItem) => hasActiveItem(subItem, isActive)) ?? false,
      })),
    [isActive, menuItems],
  );

  const dashboardItem = itemsWithState.find((item) => item.path === "/") ?? null;
  const authorizationItems = itemsWithState.filter((item) => item.path !== "/");

  const toggleMenu = (key: string) => {
    setOpenMenus((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const renderNestedItems = (
    items: SidebarMenuSubItem[],
    parentKey: string,
    depth = 0,
  ) => {
    return (
      <ul className={`${depth === 0 ? "ml-9 mt-2" : "ml-4 mt-1"} space-y-1`}>
        {items.map((item, index) => {
          const itemKey = `${parentKey}:${item.name}:${index}`;
          const itemIsActive = hasActiveItem(item, isActive);
          const isOpen = openMenus[itemKey] ?? itemIsActive;

          if (item.subItems?.length) {
            return (
              <li key={itemKey}>
                <button
                  type="button"
                  onClick={() => toggleMenu(itemKey)}
                  className={`menu-dropdown-item flex w-full items-center text-left ${
                    itemIsActive ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"
                  }`}
                >
                  <span>{item.name}</span>
                  <ChevronDownIcon
                    className={`ml-auto h-4 w-4 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-brand-500" : ""
                    }`}
                  />
                </button>
                {isOpen ? renderNestedItems(item.subItems, itemKey, depth + 1) : null}
              </li>
            );
          }

          if (item.path) {
            return (
              <li key={itemKey}>
                <Link
                  href={item.path}
                  className={`menu-dropdown-item ${
                    isActive(item.path) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            );
          }

          return (
            <li key={itemKey}>
              <span className="menu-dropdown-item menu-dropdown-item-inactive block">{item.name}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderMenu = (item: SidebarMenuItem & { isDirectActive: boolean; isSubmenuActive: boolean }, index: number) => {
    const itemKey = `menu:${item.name}:${index}`;

    return (
      <div key={itemKey} className="mb-4">
        <h2
          className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${
            !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
        >
          {isExpanded || isHovered || isMobileOpen ? item.name : <HorizontaLDots />}
        </h2>

        <ul className="flex flex-col gap-4">
          {item.subItems?.length ? renderNestedItems(item.subItems, itemKey) : null}
        </ul>
      </div>
    );
  };

  return (
    <aside
      className={`fixed mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0 ${
        isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} left-0 top-0 z-50 lg:translate-x-0`}
      onMouseEnter={() => {
        if (!isExpanded) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex py-8 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image className="dark:hidden" src="/images/logo/logo.svg" alt="Logo" width={150} height={40} />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image src="/images/logo/logo-icon.svg" alt="Logo" width={32} height={32} />
          )}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          {dashboardItem ? (
            <ul className="mb-6 flex flex-col gap-4">
              <li>
                <Link
                  href="/"
                  className={`menu-item group ${
                    dashboardItem.isDirectActive ? "menu-item-active" : "menu-item-inactive"
                  }`}
                >
                  <span
                    className={dashboardItem.isDirectActive ? "menu-item-icon-active" : "menu-item-icon-inactive"}
                  >
                    {iconMap[dashboardItem.iconKey]}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{dashboardItem.name}</span>
                  )}
                </Link>
              </li>
            </ul>
          ) : null}

          {authorizationItems.map((item, index) => renderMenu(item, index + 1))}
        </nav>
      </div>
    </aside>
  );
}
