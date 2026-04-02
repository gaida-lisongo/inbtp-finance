import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import TeacherCourseWorkspace from "@/components/teacher/TeacherCourseWorkspace";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getTeacherCoursePageData } from "@/lib/utils/supabase/teacher-teaching";

type TeacherCoursePageProps = {
  params: Promise<{
    matiere_id: string;
  }>;
  searchParams: Promise<{
    tab?: string;
    status?: string;
    message?: string;
  }>;
};

const getErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Impossible de charger ce cours.";
  }

  switch (error.message) {
    case "programme_access_denied":
    case "teacher_access_denied":
      return "Cette matiere n'est pas accessible avec votre compte enseignant.";
    default:
      return error.message;
  }
};

const getFeedbackMessage = (status?: string, message?: string) => {
  if (status === "success") {
    return "Les modifications ont été enregistrées.";
  }

  if (status !== "error" || !message) {
    return null;
  }

  switch (message) {
    case "invalid_structured_json":
      return "Un champ structuré contient un JSON invalide.";
    case "invalid_plan_json":
      return "Le plan du cours est invalide.";
    case "teacher_access_denied":
      return "Ce cours n'est pas accessible avec votre compte enseignant.";
    case "cours_required":
      return "Le cours à modifier est introuvable.";
    case "cotation_saved":
      return "Les fiches de cotation ont été enregistrées.";
    case "cotation_csv_imported":
      return "Le fichier CSV a été importé avec succès.";
    case "cc_out_of_range":
      return "La note CC doit être comprise entre 0 et 10.";
    case "examen_out_of_range":
      return "La note Examen doit être comprise entre 0 et 10.";
    case "rattrapage_out_of_range":
      return "La note de rattrapage doit être comprise entre 0 et 20.";
    case "rachat_out_of_range":
      return "La note de rachat doit être comprise entre 0 et 20.";
    case "csv_empty":
      return "Le fichier CSV est vide ou invalide.";
    case "rachat_requires_all_scores":
      return "Le rachat n'est autorisé que si CC, Examen et Rattrapage sont renseignés.";
    case "matiere_required":
      return "La matière ciblée est introuvable.";
    case "invalid_cotation_rows":
      return "Le payload de cotation est invalide.";
    case "cotation_save_failed":
      return "Impossible d'enregistrer les cotes.";
    case "cotation_csv_import_failed":
      return "Impossible d'importer le fichier CSV.";
    default:
      return message;
  }
};

export default async function TeacherCoursePage({ params, searchParams }: TeacherCoursePageProps) {
  const [{ matiere_id: matiereId }, user, queryParams] = await Promise.all([params, getAuthenticatedUser(), searchParams]);

  if (!user) {
    redirect("/signin");
  }

  if (user.activePersona !== "teacher") {
    redirect("/");
  }

  let assignment;

  try {
    assignment = await getTeacherCoursePageData(matiereId);
  } catch (error) {
    return (
      <div className="rounded-3xl border border-error-200 bg-white p-8 shadow-theme-sm dark:border-error-500/30 dark:bg-white/[0.03]">
        <div className="text-sm font-medium uppercase tracking-[0.2em] text-error-600">Cours indisponible</div>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white/90">Impossible de charger ce cours</h1>
        <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{getErrorMessage(error)}</p>
      </div>
    );
  }

  const feedbackMessage = getFeedbackMessage(queryParams.status, queryParams.message);
  const workspaceData = JSON.parse(JSON.stringify(assignment)) as typeof assignment;

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={assignment.matiere.designation || "Cours"} />
      {queryParams.status === "success" && feedbackMessage ? (
        <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
          {feedbackMessage}
        </div>
      ) : null}
      {queryParams.status === "error" && feedbackMessage ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
          {feedbackMessage}
        </div>
      ) : null}
      <TeacherCourseWorkspace data={workspaceData} initialTab={queryParams.tab} />
    </div>
  );
}
