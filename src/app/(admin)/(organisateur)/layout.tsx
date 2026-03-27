import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export default async function OrganisateurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/signin");
  }

  if (user.role !== "organisateur") {
    redirect("/signin?error=access_denied");
  }

  return <>{children}</>;
}
