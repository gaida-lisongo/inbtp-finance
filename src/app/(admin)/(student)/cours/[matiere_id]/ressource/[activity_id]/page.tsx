import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StudentCourseActivityErrorState from "@/components/student/StudentCourseActivityErrorState";
import StudentCourseActivityPage from "@/components/student/StudentCourseActivityPage";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getActivityAccessPageData } from "@/lib/utils/supabase/student-course";

type ActivityPageProps = {
  params: Promise<{
    matiere_id: string;
    activity_id: string;
  }>;
};

export default async function RessourceActivityPage({ params }: ActivityPageProps) {
  const [{ matiere_id: matiereId, activity_id: activityId }, user] = await Promise.all([params, getAuthenticatedUser()]);

  if (!user) {
    redirect("/signin");
  }

  if (user.accountType !== "student") {
    redirect("/");
  }

  const loadResult = await (async () => {
    try {
      const data = await getActivityAccessPageData(matiereId, activityId, "ressource");
      return { data, error: null as string | null };
    } catch (error) {
      return { data: null as Awaited<ReturnType<typeof getActivityAccessPageData>> | null, error: getErrorMessage(error) };
    }
  })();

  if (!loadResult.data) {
    return <StudentCourseActivityErrorState matiereId={matiereId} message={loadResult.error ?? getErrorMessage(null)} />;
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb 
        pageRoot="Cours"
        path={`/cours/${matiereId}`}
        detailPage={`Ressource | ${loadResult.data.activity.designation}`}
        pageTitle={`Ressource`} 
      />
      <StudentCourseActivityPage category="ressource" matiereId={matiereId} data={loadResult.data} />
    </div>
  );
}

const getErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Cette activité n'est pas accessible pour le moment.";
  }

  switch (error.message) {
    case "activity_payment_required":
      return "Le paiement de cette activité est requis avant d'accéder à son espace dédié.";
    case "activity_not_found":
      return "Cette activité n'est pas rattachée à votre cours.";
    case "programme_access_denied":
      return "Vous n'avez pas accès à cette activité avec votre compte étudiant.";
    default:
      return error.message;
  }
};
