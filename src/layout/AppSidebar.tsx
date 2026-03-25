"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { useSidebar } from "@/context/SidebarContext";
import { CalenderIcon, ChevronDownIcon, GridIcon } from "@/icons";

export type AcademicSidebarData = {
  annees: { id: string; designation: string | null }[];
  promotions: { id: string; designation: string | null }[];
};

type PromotionMenuItem = {
  id: string;
  name: string;
  fraisPath: string;
  modalitesPath: string;
};

type AnneeMenuItem = {
  id: string;
  name: string;
  promotions: PromotionMenuItem[];
};

const dashboardItem = {
  name: "Dashboard",
  path: "/",
  icon: <GridIcon />,
};

const AppSidebar: React.FC<{ data: AcademicSidebarData }> = ({ data }) => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const [manualOpenAnneeId, setManualOpenAnneeId] = useState<string | null>(null);
  const [manualOpenPromotionKey, setManualOpenPromotionKey] = useState<string | null>(null);

  const academicItems = useMemo<AnneeMenuItem[]>(
    () =>
      data.annees.map((annee) => ({
        id: annee.id,
        name: annee.designation ?? "Annee sans designation",
        promotions: data.promotions.map((promotion) => ({
          id: promotion.id,
          name: promotion.designation ?? "Promotion sans designation",
          fraisPath: `/promotion/${promotion.id}`,
          modalitesPath: `/promotion/${promotion.id}/${annee.id}`,
        })),
      })),
    [data.annees, data.promotions],
  );

  const activeAnneeId =
    academicItems.find((annee) =>
      annee.promotions.some(
        (promotion) => pathname === promotion.fraisPath || pathname === promotion.modalitesPath,
      ),
    )?.id ?? null;

  const activePromotionKey =
    academicItems
      .flatMap((annee) =>
        annee.promotions.map((promotion) => ({
          key: `${annee.id}-${promotion.id}`,
          isActive: pathname === promotion.fraisPath || pathname === promotion.modalitesPath,
        })),
      )
      .find((item) => item.isActive)?.key ?? null;

  const effectiveOpenAnneeId = manualOpenAnneeId ?? activeAnneeId;
  const effectiveOpenPromotionKey = manualOpenPromotionKey ?? activePromotionKey;

  const isCompact = !isExpanded && !isHovered && !isMobileOpen;

  const toggleAnnee = (anneeId: string) => {
    setManualOpenAnneeId((currentId) => {
      const effectiveCurrentId = currentId ?? activeAnneeId;
      return effectiveCurrentId === anneeId ? null : anneeId;
    });
  };

  const togglePromotion = (promotionKey: string) => {
    setManualOpenPromotionKey((currentKey) => {
      const effectiveCurrentKey = currentKey ?? activePromotionKey;
      return effectiveCurrentKey === promotionKey ? null : promotionKey;
    });
  };

  const isActivePath = (path: string) => pathname === path;

  return (
    <aside
      className={`fixed left-0 top-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0 ${
        isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex py-8 ${isCompact ? "lg:justify-center" : "justify-start"}`}>
        <Link href="/" className="transition-transform duration-300 hover:scale-[1.02]">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="animate-rise-in flex items-center gap-3">
              <Image src="/images/logo/logo.png" alt="ElmesFin" width={42} height={42} className="h-10 w-10 rounded-xl object-cover shadow-lg" />
              <div>
                <p className="text-sm font-semibold tracking-[0.22em] text-error-600 dark:text-error-300">
                  ELMESFIN
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Finance INBTP</p>
              </div>
            </div>
          ) : (
            <Image src="/images/logo/logo.png" alt="ElmesFin" width={38} height={38} className="h-9 w-9 rounded-xl object-cover shadow-lg" />
          )}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-3">
            <Link
              href={dashboardItem.path}
              className={`menu-item group ${isActivePath(dashboardItem.path) ? "menu-item-active" : "menu-item-inactive"}`}
            >
              <span
                className={
                  isActivePath(dashboardItem.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"
                }
              >
                {dashboardItem.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{dashboardItem.name}</span>
              )}
            </Link>

            {academicItems.map((annee) => (
              <div key={annee.id} className="rounded-2xl border border-gray-200/80 px-2 py-2 dark:border-gray-800">
                <button
                  onClick={() => toggleAnnee(annee.id)}
                  className={`menu-item group w-full cursor-pointer ${
                    effectiveOpenAnneeId === annee.id ? "menu-item-active" : "menu-item-inactive"
                  } ${isCompact ? "lg:justify-center" : "lg:justify-start"}`}
                >
                  <span
                    className={
                      effectiveOpenAnneeId === annee.id ? "menu-item-icon-active" : "menu-item-icon-inactive"
                    }
                  >
                    <CalenderIcon />
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <>
                      <span className="menu-item-text">{annee.name}</span>
                      <ChevronDownIcon
                        className={`ml-auto h-5 w-5 transition-transform duration-200 ${
                          effectiveOpenAnneeId === annee.id ? "rotate-180 text-brand-500" : ""
                        }`}
                      />
                    </>
                  )}
                </button>

                {(isExpanded || isHovered || isMobileOpen) && effectiveOpenAnneeId === annee.id ? (
                  <div className="mt-2 space-y-2">
                    {annee.promotions.map((promotion) => {
                      const promotionKey = `${annee.id}-${promotion.id}`;
                      const isPromotionOpen = effectiveOpenPromotionKey === promotionKey;
                      const isPromotionActive =
                        pathname === promotion.fraisPath || pathname === promotion.modalitesPath;

                      return (
                        <div key={promotionKey} className="rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/[0.02]">
                          <button
                            onClick={() => togglePromotion(promotionKey)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                              isPromotionActive
                                ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                            }`}
                          >
                            <span className="h-2 w-2 rounded-full bg-current/70" />
                            <span>{promotion.name}</span>
                            <ChevronDownIcon
                              className={`ml-auto h-4 w-4 transition-transform duration-200 ${
                                isPromotionOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {isPromotionOpen ? (
                            <div className="mt-2 ml-5 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-700">
                              <Link
                                href={promotion.fraisPath}
                                className={`menu-dropdown-item ${
                                  isActivePath(promotion.fraisPath)
                                    ? "menu-dropdown-item-active"
                                    : "menu-dropdown-item-inactive"
                                }`}
                              >
                                Frais
                              </Link>
                              <Link
                                href={promotion.modalitesPath}
                                className={`menu-dropdown-item ${
                                  isActivePath(promotion.modalitesPath)
                                    ? "menu-dropdown-item-active"
                                    : "menu-dropdown-item-inactive"
                                }`}
                              >
                                Modalites de paiements
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
