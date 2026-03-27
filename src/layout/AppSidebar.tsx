"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { SidebarMenuItem } from "@/lib/navigation/admin-sidebar";
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

export default function AppSidebar({ menuItems }: AppSidebarProps) {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const subMenuRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<number, number>>({});

  const isActive = useCallback((path: string) => pathname === path, [pathname]);

  const itemsWithState = useMemo(
    () =>
      menuItems.map((item) => ({
        ...item,
        isDirectActive: item.path ? isActive(item.path) : false,
        isSubmenuActive: item.subItems?.some((subItem) => isActive(subItem.path)) ?? false,
      })),
    [isActive, menuItems],
  );

  useEffect(() => {
    const activeSubmenuIndex = itemsWithState.findIndex((item) => item.isSubmenuActive);
    setOpenSubmenuIndex(activeSubmenuIndex >= 0 ? activeSubmenuIndex : null);
  }, [itemsWithState]);

  useEffect(() => {
    if (openSubmenuIndex === null) {
      return;
    }

    const submenu = subMenuRefs.current[openSubmenuIndex];

    if (submenu) {
      setSubMenuHeight((previous) => ({
        ...previous,
        [openSubmenuIndex]: submenu.scrollHeight,
      }));
    }
  }, [openSubmenuIndex, itemsWithState]);

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
          <h2
            className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${
              !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
            }`}
          >
            {isExpanded || isHovered || isMobileOpen ? "Menu" : <HorizontaLDots />}
          </h2>

          <ul className="flex flex-col gap-4">
            {itemsWithState.map((item, index) => {
              const isActiveItem = item.isDirectActive || item.isSubmenuActive;
              const icon = iconMap[item.iconKey];

              return (
                <li key={`${item.name}-${index}`}>
                  {item.subItems ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setOpenSubmenuIndex((previous) => (previous === index ? null : index))}
                        className={`menu-item group cursor-pointer ${
                          isActiveItem ? "menu-item-active" : "menu-item-inactive"
                        } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                      >
                        <span className={isActiveItem ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                          {icon}
                        </span>
                        {(isExpanded || isHovered || isMobileOpen) && (
                          <span className="menu-item-text">{item.name}</span>
                        )}
                        {(isExpanded || isHovered || isMobileOpen) && (
                          <ChevronDownIcon
                            className={`ml-auto h-5 w-5 transition-transform duration-200 ${
                              openSubmenuIndex === index ? "rotate-180 text-brand-500" : ""
                            }`}
                          />
                        )}
                      </button>

                      {(isExpanded || isHovered || isMobileOpen) && (
                        <div
                          ref={(element) => {
                            subMenuRefs.current[index] = element;
                          }}
                          className="overflow-hidden transition-all duration-300"
                          style={{
                            height: openSubmenuIndex === index ? `${subMenuHeight[index] ?? 0}px` : "0px",
                          }}
                        >
                          <ul className="ml-9 mt-2 space-y-1">
                            {item.subItems.map((subItem) => (
                              <li key={subItem.path}>
                                <Link
                                  href={subItem.path}
                                  className={`menu-dropdown-item ${
                                    isActive(subItem.path)
                                      ? "menu-dropdown-item-active"
                                      : "menu-dropdown-item-inactive"
                                  }`}
                                >
                                  {subItem.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    item.path && (
                      <Link
                        href={item.path}
                        className={`menu-item group ${isActiveItem ? "menu-item-active" : "menu-item-inactive"}`}
                      >
                        <span className={isActiveItem ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                          {icon}
                        </span>
                        {(isExpanded || isHovered || isMobileOpen) && (
                          <span className="menu-item-text">{item.name}</span>
                        )}
                      </Link>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
