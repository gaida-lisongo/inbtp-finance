"use client";

import React, { useEffect, useState } from "react";

import { getAdminSidebarMenu, type SidebarMenuItem } from "@/lib/navigation/admin-sidebar";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { useUserStore } from "@/store/useUserStore";

type AdminShellProps = {
  children: React.ReactNode;
};

export default function AdminShell({ children }: AdminShellProps) {
  const { profile, codes, accountType, isLoading } = useUserStore();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const [ sidebarMenu, setSidebarMenu ] = useState<SidebarMenuItem[]>([]);
  // const [ teacherNotifications, setTeacherNotifications ] = useState<TeacherRecoursNotificationItem[]>([]);
  // const [ adminNotifications, setAdminNotifications ] = useState<AdminDashboardNotificationItem[]>([]);

  useEffect(() => {
    if (codes && accountType && profile?.id) {
      getAdminSidebarMenu({ accountType, codes, id: profile.id })
        .then((items: SidebarMenuItem[]) => setSidebarMenu(items))
        .catch((err: any) => {
          console.error("Erreur dans l'obtention du menu:", err);
        })
    }
  }, [codes, accountType, profile?.id])

  // useEffect(() => {
  //   if (profile) {
  //     accountType == 'titulaire' && getTeacherRecoursNotificationSnapshot(profile?.id ?? undefined)
  //       .then(notifications => setTeacherNotifications((notifications?.items ?? []).slice(0, 5)))
  //       .catch((err: any) => {
  //         console.error("Erreur dans l'obtention des notifications:", err);
  //       })

  //     accountType !== 'titulaire' && accountType !== 'student' && getAdminDashboardNotificationSnapshot(profile?.id ?? undefined)
  //       .then(notifications => setAdminNotifications((notifications?.items ?? []).slice(0, 5)))
  //       .catch((err: any) => {
  //         console.error("Erreur dans l'obtention des notifications:", err);
  //       })
        
  //   }
  // }, [profile])

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  if (isLoading || !profile || !codes || !accountType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar menuItems={sidebarMenu} />
      <Backdrop />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  );
}
