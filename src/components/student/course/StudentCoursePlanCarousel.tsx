import type { PlanChapter } from "@/components/student/course/course-overview-shared";

type StudentCoursePlanCarouselProps = {
  chapters: PlanChapter[];
};

export default function StudentCoursePlanCarousel({ chapters }: StudentCoursePlanCarouselProps) {
  if (chapters.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <div className="text-sm font-medium uppercase tracking-[0.2em] text-brand-500">Plan du cours</div>
        <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">Chapitres en carrousel</h2>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex snap-x snap-mandatory gap-4">
          {chapters.map((chapter, index) => (
            <article
              key={`${chapter.chapter}-${index}`}
              className="min-w-[85%] snap-center border border-gray-200 bg-white p-5 shadow-theme-sm sm:min-w-[420px] dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500">Chapitre {index + 1}</div>
              <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white/90">{chapter.chapter}</h3>

              <div className="mt-5 space-y-3">
                {chapter.items.length > 0 ? (
                  chapter.items.map((item, itemIndex) => (
                    <div
                      key={`${chapter.chapter}-${itemIndex}`}
                      className="bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300"
                    >
                      {item}
                    </div>
                  ))
                ) : (
                  <div className="border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Aucun item détaillé pour ce chapitre.
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
