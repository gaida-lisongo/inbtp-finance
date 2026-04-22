import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StudentCourseOverview from "@/components/student/StudentCourseOverview";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getStudentCourseDetails } from "@/lib/utils/supabase/student-course";

type StudentCoursePageProps = {
  params: Promise<{
    matiere_id: string;
  }>;
};

const getErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Impossible de charger ce cours.";
  }

  switch (error.message) {
    case "matiere_not_found":
      return "Cette matière est introuvable.";
    case "programme_access_denied":
      return "Vous n'avez pas accès à cette matière avec votre compte étudiant.";
    default:
      return error.message;
  }
};

export default async function StudentCoursePage({ params }: StudentCoursePageProps) {
  const [{ matiere_id: matiereId }, user] = await Promise.all([params, getAuthenticatedUser()]);

  if (!user) {
    redirect("/signin");
  }

  if (user.accountType !== "student") {
    redirect("/");
  }

  const loadResult = await (async () => {
    try {
      const data = await getStudentCourseDetails(matiereId);
      return { data, error: null as string | null };
    } catch (error) {
      return { data: null as Awaited<ReturnType<typeof getStudentCourseDetails>> | null, error: getErrorMessage(error) };
    }
  })();

  if (!loadResult.data) {
    return (
      <div className="rounded-3xl border border-error-200 bg-white p-8 shadow-theme-sm dark:border-error-500/30 dark:bg-white/[0.03]">
        <div className="text-sm font-medium uppercase tracking-[0.2em] text-error-600">Cours indisponible</div>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white/90">Impossible de charger ce cours</h1>
        <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
          {loadResult.error ?? "Impossible de charger ce cours."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb 
        pageRoot="Cours"
        path={`/cours/${matiereId}`}
        detailPage={`Cours de ${loadResult?.data?.matiere?.designation}`}
        pageTitle={loadResult.data.matiere.designation || "Cours"} 
      />
      <StudentCourseOverview data={loadResult.data} />
    </div>
  );
}
