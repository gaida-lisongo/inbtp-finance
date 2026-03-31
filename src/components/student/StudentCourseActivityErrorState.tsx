import Link from "next/link";

type StudentCourseActivityErrorStateProps = {
  matiereId: string;
  message: string;
};

export default function StudentCourseActivityErrorState({
  matiereId,
  message,
}: StudentCourseActivityErrorStateProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-error-200 bg-white p-8 shadow-theme-sm dark:border-error-500/30 dark:bg-white/[0.03]">
        <div className="text-sm font-medium uppercase tracking-[0.2em] text-error-600">Activité indisponible</div>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white/90">Impossible de charger cette activité</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">{message}</p>
        <div className="mt-6">
          <Link
            href={`/cours/${matiereId}`}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Retour au cours
          </Link>
        </div>
      </section>
    </div>
  );
}
