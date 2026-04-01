import type { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import FacultyDashboardSnapshot from "@/components/education/FacultyDashboardSnapshot";
import StudentDashboardSnapshot from "@/components/education/StudentDashboardSnapshot";
import { getFacultyDashboardSnapshot } from "@/lib/utils/supabase/faculte-dashboard";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getStudentDashboardSnapshot } from "@/lib/utils/supabase/student-dashboard";
import { getTeacherAssignedCourses } from "@/lib/utils/supabase/teacher-teaching";

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
    const assignments = await getTeacherAssignedCourses(user.agentId ?? undefined);
    const programmeIds = new Set(assignments.map((assignment) => assignment.programme?.id).filter(Boolean));
    const matiereIds = new Set(assignments.map((assignment) => assignment.matiere.id));

    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Dashboard Enseignant" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Promotions</div>
            <div className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white/90">{programmeIds.size}</div>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Matieres</div>
            <div className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white/90">{matiereIds.size}</div>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Cours attribues</div>
            <div className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white/90">{assignments.length}</div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Affectations chargees apres connexion</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Le menu enseignant est maintenant construit a partir des cours dont vous etes titulaire, en remontant
            automatiquement la matiere, l&apos;unite, le semestre, la promotion et l&apos;annee academique.
          </p>
        </div>
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
