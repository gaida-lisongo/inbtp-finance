import {
  renderStructuredValue,
  sectionTitleMap,
} from "@/components/student/course/course-overview-shared";

type StudentCourseDetailsSectionProps = {
  sections: Array<{
    key: string;
    value: unknown;
  }>;
};

export default function StudentCourseDetailsSection({ sections }: StudentCourseDetailsSectionProps) {
  return (
    <section className="space-y-6">
      {sections.length > 0 ? (
        sections.map((section) => (
          <article key={section.key} className="border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">
              {sectionTitleMap[section.key] || section.key}
            </h2>
            <div className="mt-4">{renderStructuredValue(section.value)}</div>
          </article>
        ))
      ) : (
        <article className="border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500 shadow-theme-sm dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400">
          Aucun contenu structuré n&apos;est encore renseigné pour ce cours.
        </article>
      )}
    </section>
  );
}
