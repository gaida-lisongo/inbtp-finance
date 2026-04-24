import type { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import FacultyDashboardSnapshot from "@/components/education/FacultyDashboardSnapshot";
import ParcoursDashboardSnapshot from "@/components/education/ParcoursDashboardSnapshot";
import StudentDashboardSnapshot from "@/components/education/StudentDashboardSnapshot";
import TeacherDashboardSnapshot from "@/components/teacher/TeacherDashboardSnapshot";
import { getFacultyDashboardSnapshot } from "@/lib/utils/supabase/faculte-dashboard";
import { getParcoursDashboardSnapshot } from "@/lib/utils/supabase/parcours-dashboard";
import { getStudentDashboardSnapshot } from "@/lib/utils/supabase/student-dashboard";
import { getTeacherDashboardSnapshot } from "@/lib/utils/supabase/teacher-dashboard";
import { getUser } from "../actions/user";

export const metadata: Metadata = {
  title: "Dashboard | Plateforme academique",
  description: "Lecture serveur du dashboard agent ou etudiant selon le compte connecte.",
};

export default async function EducationDashboardPage() {
  const user = await getUser();

  if (!user?.role) {
    const snapshot = await getStudentDashboardSnapshot();

    return (
      <div className="space-y-6">
        <PageBreadcrumb 
          detailPage="Notifications" 
          pageTitle="Notifications" 
          pageRoot="Dashboard"
          path="/"/>
        <StudentDashboardSnapshot snapshot={snapshot} />
      </div>
    );
  }

  if (user?.role === "titulaire") {
    const snapshot = await getTeacherDashboardSnapshot(user.id ?? undefined);

    return (
      <div className="space-y-6">
        <PageBreadcrumb 
          detailPage="Dashboard" 
          pageTitle="Dashboard Enseignant" 
          pageRoot="Dashboard"
          path="/"/>
        <TeacherDashboardSnapshot snapshot={snapshot} />
      </div>
    );
  }

  if (user?.role !== "titulaire" && user?.role && user.id) {
    const req = await fetch(`${process.env.NEXT_PUBLIC_HOST_URL}/api/user?agentId=${user.id}`);
    
    if (!req.ok) {
      throw new Error("Failed to fetch user data");
    }

    const {data} = await req.json();
    const activeCodes = data.filter((item: any) => item.is_active === 'oui').map((item: any) => item.designation);
    console.log("Active codes: ", activeCodes)

    if (activeCodes.includes("CS")) {
      const facultySnapshot = await getFacultyDashboardSnapshot();

      return (
        <div className="space-y-6">
          <PageBreadcrumb 
          detailPage="Dashboard" 
          pageTitle="Dashboard Faculte" 
          pageRoot="Dashboard"
          path="/"/>
          <FacultyDashboardSnapshot snapshot={facultySnapshot} />
        </div>
      );
    }

    const parcoursSnapshot = await getParcoursDashboardSnapshot();

    return (
      <div className="space-y-6">
        <PageBreadcrumb 
          detailPage="Dashboard" 
          pageTitle="Dashboard Parcours" 
          pageRoot="Dashboard"
          path="/"/>
        <ParcoursDashboardSnapshot snapshot={parcoursSnapshot} />
      </div>
    );
  }

  const facultySnapshot = await getFacultyDashboardSnapshot();

  return (
    <div className="space-y-6">
      <PageBreadcrumb 
          detailPage="Dashboard" 
          pageTitle="Dashboard Faculte" 
          pageRoot="Dashboard"
          path="/"/>
      <FacultyDashboardSnapshot snapshot={facultySnapshot} />
    </div>
  );
}
