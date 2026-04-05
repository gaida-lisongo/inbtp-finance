import type { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import FacultyDashboardSnapshot from "@/components/education/FacultyDashboardSnapshot";
import ParcoursDashboardSnapshot from "@/components/education/ParcoursDashboardSnapshot";
import StudentDashboardSnapshot from "@/components/education/StudentDashboardSnapshot";
import TeacherDashboardSnapshot from "@/components/teacher/TeacherDashboardSnapshot";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { getFacultyDashboardSnapshot } from "@/lib/utils/supabase/faculte-dashboard";
import { getParcoursDashboardSnapshot } from "@/lib/utils/supabase/parcours-dashboard";
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

  if (user?.activePersona === "admin" && user.agentId) {
    const activeCodes = await getActiveAutorisationCodesForAgent(user.agentId);

    if (activeCodes.includes("CS")) {
      const facultySnapshot = await getFacultyDashboardSnapshot();

      return (
        <div className="space-y-6">
          <PageBreadcrumb pageTitle="Dashboard Faculte" />
          <FacultyDashboardSnapshot snapshot={facultySnapshot} />
        </div>
      );
    }

    const parcoursSnapshot = await getParcoursDashboardSnapshot();

    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Dashboard Parcours" />
        <ParcoursDashboardSnapshot snapshot={parcoursSnapshot} />
      </div>
    );
  }

  const facultySnapshot = await getFacultyDashboardSnapshot();

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Dashboard Faculte" />
      <FacultyDashboardSnapshot snapshot={facultySnapshot} />
    </div>
  );
}
