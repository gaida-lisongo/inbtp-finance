import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getTeacherProgrammePageData } from "@/lib/utils/supabase/teacher-teaching";

type TeacherProgrammePageProps = {
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
    case "teacher_access_denied":
      return "Cette promotion n'est pas accessible avec votre compte enseignant.";
    default:
      return error.message;
  }
};

export default async function TeacherProgrammePage({ params }: TeacherProgrammePageProps) {
  const [{ id }, user] = await Promise.all([params, getAuthenticatedUser()]);

  if (!user) {
    redirect("/signin");
  }

  if (user.activePersona !== "teacher") {
    redirect("/");
  }

  try {
    const data = await getTeacherProgrammePageData(id);

    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle={data.programme.designation || "Promotion"} />

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Promotion</div>
              <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white/90">
                {data.programme.designation || "Non renseignee"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Annee</div>
              <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white/90">
                {data.annee?.designation || "Non renseignee"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Cours attribues</div>
              <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white/90">{data.assignments.length}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {data.assignments.map((assignment) => (
            <div
              key={assignment.cours.id}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-brand-500">Matiere</div>
                  <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white/90">
                    {assignment.matiere.designation || "Matiere sans designation"}
                  </h2>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Canal: {assignment.cours.slug || "Non configure"}{assignment.cours.entra_id ? " • Teams synchronise" : ""}
                  </p>
                </div>

                <a
                  href={`/enseignant/cours/${assignment.matiere.id}`}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                >
                  Ouvrir le cours
                </a>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Unite</div>
                  <div className="mt-2 text-sm font-medium text-gray-900 dark:text-white/90">
                    {assignment.unite?.designation || "Non renseignee"}
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Code unite</div>
                  <div className="mt-2 text-sm font-medium text-gray-900 dark:text-white/90">
                    {assignment.unite?.code || "Non renseigne"}
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Semestre</div>
                  <div className="mt-2 text-sm font-medium text-gray-900 dark:text-white/90">
                    {assignment.semestre?.designation || "Non renseigne"}
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Credits</div>
                  <div className="mt-2 text-sm font-medium text-gray-900 dark:text-white/90">
                    {assignment.matiere.credits ?? 0}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
