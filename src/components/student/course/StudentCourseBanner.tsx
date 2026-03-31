import type { StudentCourseOverviewData } from "@/components/student/course/course-overview-shared";

type StudentCourseBannerProps = {
  data: StudentCourseOverviewData;
};

export default function StudentCourseBanner({ data }: StudentCourseBannerProps) {
  return (
    <section className="overflow-hidden border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="bg-linear-to-r from-slate-950 via-slate-800 to-brand-600 px-5 py-7 sm:px-8 sm:py-10">
        <div className="max-w-4xl">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-white/70">Cours académique</div>
          <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            {data.matiere.designation || "Matière"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/80">
            {typeof data.cours.description === "string" && data.cours.description.trim().length > 0
              ? data.cours.description
              : "Consultez rapidement les activités rattachées à cette matière et le contenu pédagogique du cours."}
          </p>
        </div>
      </div>

      <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-8 sm:py-6 xl:grid-cols-4">
        <div className="border border-gray-200 bg-gray-50 px-4 py-4 text-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-gray-500 dark:text-gray-400">Titulaire</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">
            {data.cours.titulaire
              ? [data.cours.titulaire.prenom, data.cours.titulaire.post_nom, data.cours.titulaire.nom].filter(Boolean).join(" ")
              : "Non renseigné"}
          </div>
        </div>
        <div className="border border-gray-200 bg-gray-50 px-4 py-4 text-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-gray-500 dark:text-gray-400">Crédits</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{data.matiere.credits ?? 0}</div>
        </div>
        <div className="border border-gray-200 bg-gray-50 px-4 py-4 text-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-gray-500 dark:text-gray-400">Promotion</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{data.programme.designation || "Non renseignée"}</div>
        </div>
        <div className="border border-gray-200 bg-gray-50 px-4 py-4 text-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-gray-500 dark:text-gray-400">Semestre</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{data.semestre.designation || "Non renseigné"}</div>
        </div>
        <div className="border border-gray-200 bg-gray-50 px-4 py-4 text-sm sm:col-span-2 xl:col-span-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-gray-500 dark:text-gray-400">Unité d'enseignement</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{data.unite.designation || "Non renseignée"}</div>
        </div>
      </div>
    </section>
  );
}
