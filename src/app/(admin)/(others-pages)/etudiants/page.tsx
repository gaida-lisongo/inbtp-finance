import { redirect } from "next/navigation";
import type { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StudentsManagementPanel from "@/components/students/StudentsManagementPanel";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getStudents } from "@/lib/utils/supabase/students";

export const metadata: Metadata = {
  title: "Etudiants | Dashboard Agents",
  description: "Gestion des etudiants par le gestionnaire",
};

export default async function StudentsPage() {
  const user = await getAuthenticatedUser();

  if (!user || !user.canManageStudents) {
    redirect("/signin?error=access_denied");
  }

  const students = await getStudents();

  return (
    <div>
      <PageBreadcrumb pageTitle="Etudiants" />
      <StudentsManagementPanel initialStudents={students} />
    </div>
  );
}
