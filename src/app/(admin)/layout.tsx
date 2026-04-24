import { redirect } from "next/navigation";
import AdminShell from "@/layout/AdminShell";
import UserProvider from "@/layout/UserProvider";
import { getUser } from "../actions/user";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/signin");
  }
  return (
      <UserProvider initialUser={user}>
        <AdminShell>
        {children}
      </AdminShell>
    </UserProvider>
  );
}
