import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import TeacherRetraitsPanel from "@/components/teacher/TeacherRetraitsPanel";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import {
  getTeacherRetraitActivities,
  getTeacherRetraitsActivity,
} from "@/lib/utils/supabase/teacher-retraits";

const getErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Impossible de charger les retraits.";
  }

  switch (error.message) {
    case "teacher_access_denied":
      return "Cet espace est réservé au compte enseignant.";
    default:
      return error.message;
  }
};

export default async function TeacherRetraitsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/signin");
  }

  if (user.activePersona !== "teacher") {
    redirect("/");
  }

  const payload = await Promise.all([
    getTeacherRetraitsActivity(),
    getTeacherRetraitActivities(),
  ])
    .then(([retraits, activities]) => ({ retraits, activities, error: null as unknown }))
    .catch((error) => ({ retraits: [], activities: [], error }));

  if (payload.error) {
    return (
      <div className="rounded-3xl border border-error-200 bg-white p-8 shadow-theme-sm dark:border-error-500/30 dark:bg-white/[0.03]">
        <div className="text-sm font-medium uppercase tracking-[0.2em] text-error-600">Retraits indisponibles</div>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white/90">Impossible de charger les retraits</h1>
        <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{getErrorMessage(payload.error)}</p>
      </div>
    );
  }

  const { retraits, activities } = payload;

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Retraits" />

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-brand-500">
              Retraits enseignant
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">
              Gestion des retraits d&apos;activités
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Créez, modifiez ou supprimez vos retraits sur les activités qui vous appartiennent.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            {retraits.length} retrait(s) • {activities.length} activité(s) disponible(s)
          </div>
        </div>
      </section>

      <TeacherRetraitsPanel initialRetraits={retraits} initialActivities={activities} />
    </div>
  );
}
