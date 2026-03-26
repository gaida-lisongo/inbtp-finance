import { redirect } from "next/navigation";

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

  if (!user.canAccessAdmin) {
    redirect("/signin?error=access_denied");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
