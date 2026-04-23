import { redirect } from "next/navigation";

import { getAdminSidebarMenu } from "@/lib/navigation/admin-sidebar";
import { getAdminDashboardNotificationSnapshot } from "@/lib/utils/supabase/admin-notifications";
import { getTeacherRecoursNotificationSnapshot } from "@/lib/utils/supabase/teacher-notifications";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import AdminShell from "@/layout/AdminShell";
import UserProvider from "@/layout/UserProvider";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/signin");
  }

  const sidebarMenu = await getAdminSidebarMenu(user);
  const teacherNotificationSnapshot =
    user.activePersona === "teacher" ? await getTeacherRecoursNotificationSnapshot(user.agentId ?? undefined) : null;
  const adminNotificationSnapshot =
    user.activePersona === "admin" ? await getAdminDashboardNotificationSnapshot(user.agentId ?? undefined) : null;

  return (
      <UserProvider initialUser={user}>
        <AdminShell
          sidebarMenu={sidebarMenu}
          teacherNotifications={
            teacherNotificationSnapshot
              ? {
                  items: teacherNotificationSnapshot.items.slice(0, 5),
                  pendingCount: teacherNotificationSnapshot.pendingCount,
                }
              : undefined
          }
          adminNotifications={
            adminNotificationSnapshot
              ? {
                  items: adminNotificationSnapshot.items.slice(0, 10),
                  pendingCount: adminNotificationSnapshot.pendingCount,
                }
              : undefined
          }
        >
        {children}
      </AdminShell>
    </UserProvider>
  );
}
