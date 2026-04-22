import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StudentResourcesWorkspace from "@/components/student/StudentResourcesWorkspace";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getStudentDashboardSnapshot } from "@/lib/utils/supabase/student-dashboard";

type StudentResourcesByTypePageProps = {
  params: Promise<{
    types: string;
  }>;
};

export default async function StudentResourcesByTypePage({ params }: StudentResourcesByTypePageProps) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/signin");
  }

  if (user.accountType !== "student") {
    redirect("/");
  }

  const { types } = await params;
  const snapshot = await getStudentDashboardSnapshot({ includeAllCommandes: true });

  return (
    <div className="space-y-6">
      <PageBreadcrumb 
        pageRoot="Dashboard"
        path="/"
        detailPage={`Mes ressources`}
        pageTitle={`Ressources`} 
      />
      <StudentResourcesWorkspace snapshot={snapshot} initialType={types} />
    </div>
  );
}
