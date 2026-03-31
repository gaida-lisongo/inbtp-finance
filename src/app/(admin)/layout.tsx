import { redirect } from "next/navigation";

import { getAdminSidebarMenu } from "@/lib/navigation/admin-sidebar";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import AdminShell from "@/layout/AdminShell";

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

  return (
    <AdminShell user={user} sidebarMenu={sidebarMenu}>
      {children}
    </AdminShell>
  );
}
