"use client";

import React from "react";

import type { SidebarMenuItem } from "@/lib/navigation/admin-sidebar";
import type { AuthenticatedUser } from "@/lib/utils/supabase/session";
import type { TeacherRecoursNotificationItem } from "@/lib/utils/supabase/teacher-notifications";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";

type AdminShellProps = {
  children: React.ReactNode;
  user: AuthenticatedUser;
  sidebarMenu: SidebarMenuItem[];
  teacherNotifications?: {
    items: TeacherRecoursNotificationItem[];
    pendingCount: number;
  };
};

export default function AdminShell({ children, user, sidebarMenu, teacherNotifications }: AdminShellProps) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar menuItems={sidebarMenu} />
      <Backdrop />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        <AppHeader user={user} teacherNotifications={teacherNotifications} />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  );
}
