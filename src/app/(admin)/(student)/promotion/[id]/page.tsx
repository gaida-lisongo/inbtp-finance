import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StudentProgrammePanel from "@/components/student/StudentProgrammePanel";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getStudentProgrammePageData } from "@/lib/utils/supabase/student-teaching";

type StudentProgrammePageProps = {
  params: Promise<{
    id: string;
  }>;
};

const getErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Impossible de charger cette promotion.";
  }

  switch (error.message) {
    case "programme_not_found":
      return "Cette promotion est introuvable.";
    case "programme_access_denied":
      return "Cette promotion n'est pas accessible avec votre compte étudiant.";
    default:
      return error.message;
  }
};

export default async function StudentProgrammePage({ params }: StudentProgrammePageProps) {
  const [{ id }, user] = await Promise.all([params, getAuthenticatedUser()]);

  if (!user) {
    redirect("/signin");
  }

  if (user.accountType !== "student") {
    redirect("/");
  }

  try {
    const data = await getStudentProgrammePageData(id);

    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle={data.programme.designation || "Promotion"} />
        <StudentProgrammePanel data={data} />
      </div>
    );
  } catch (error) {
    return (
      <div className="rounded-3xl border border-error-200 bg-white p-8 shadow-theme-sm dark:border-error-500/30 dark:bg-white/[0.03]">
        <div className="text-sm font-medium uppercase tracking-[0.2em] text-error-600">Promotion indisponible</div>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white/90">Impossible de charger cette promotion</h1>
        <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{getErrorMessage(error)}</p>
      </div>
    );
  }
}
