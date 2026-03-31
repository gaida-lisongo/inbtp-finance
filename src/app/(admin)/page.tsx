import type { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import FacultyDashboardSnapshot from "@/components/education/FacultyDashboardSnapshot";
import { getFacultyDashboardSnapshot } from "@/lib/utils/supabase/faculte-dashboard";

export const metadata: Metadata = {
  title: "Dashboard Faculte | Dashboard Agents",
  description: "Lecture serveur des donnees faculte a partir de l'annee active, des programmes et des commandes.",
};

export default async function EducationDashboardPage() {
  const snapshot = await getFacultyDashboardSnapshot();

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Dashboard Faculte" />
      <FacultyDashboardSnapshot snapshot={snapshot} />
    </div>
  );
}
