import type { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import FacultyDashboardSnapshot from "@/components/education/FacultyDashboardSnapshot";
import StudentDashboardSnapshot from "@/components/education/StudentDashboardSnapshot";
import TeacherDashboardSnapshot from "@/components/teacher/TeacherDashboardSnapshot";
import { getFacultyDashboardSnapshot } from "@/lib/utils/supabase/faculte-dashboard";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getStudentDashboardSnapshot } from "@/lib/utils/supabase/student-dashboard";
import { getTeacherDashboardSnapshot } from "@/lib/utils/supabase/teacher-dashboard";

export const metadata: Metadata = {
  title: "Dashboard | Plateforme academique",
  description: "Lecture serveur du dashboard agent ou etudiant selon le compte connecte.",
};

export default async function EducationDashboardPage() {
  const user = await getAuthenticatedUser();

  if (user?.activePersona === "student") {
    const snapshot = await getStudentDashboardSnapshot();

    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Dashboard Etudiant" />
        <StudentDashboardSnapshot snapshot={snapshot} />
      </div>
    );
  }

  if (user?.activePersona === "teacher") {
    const snapshot = await getTeacherDashboardSnapshot(user.agentId ?? undefined);

    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Dashboard Enseignant" />
        <TeacherDashboardSnapshot snapshot={snapshot} />
      </div>
    );
  }

  const snapshot = await getFacultyDashboardSnapshot();

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Dashboard Faculte" />
      <FacultyDashboardSnapshot snapshot={snapshot} />
    </div>
  );
}
