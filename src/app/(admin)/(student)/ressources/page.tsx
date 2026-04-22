import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StudentResourcesWorkspace from "@/components/student/StudentResourcesWorkspace";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getStudentDashboardSnapshot } from "@/lib/utils/supabase/student-dashboard";

export default async function StudentResourcesPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/signin");
  }

  if (user.accountType !== "student") {
    redirect("/");
  }

  const snapshot = await getStudentDashboardSnapshot({ includeAllCommandes: true });

  return (
    <div className="space-y-6">
      
      <PageBreadcrumb 
        pageRoot="Dashboard"
        path="/"
        detailPage={`Mes ressources`}
        pageTitle={`Mes ressources`} 
      />
      <StudentResourcesWorkspace snapshot={snapshot} />
    </div>
  );
}
