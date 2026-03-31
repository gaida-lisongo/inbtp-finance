import type { ActivityCategory, StudentCoursePageDetails } from "@/lib/utils/supabase/student-course";

export type StudentCourseOverviewData = StudentCoursePageDetails;

export type PlanChapter = {
  chapter: string;
  items: string[];
};

export const categoryLabelMap: Record<ActivityCategory, string> = {
  tp: "Travaux pratiques",
  qcm: "QCM",
  ressource: "Ressource",
};

export const sectionTitleMap: Record<string, string> = {
  objectifs: "Objectifs",
  competences: "Compétences",
  methodologies: "Méthodologies",
  penalites: "Pénalités",
  disponibilites: "Disponibilités",
};

export const formatAmount = (value: number | null) =>
  typeof value === "number"
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value)
    : "Montant indisponible";

export const parsePlanChapters = (value: unknown): PlanChapter[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const chapter = typeof record.chapter === "string" ? record.chapter.trim() : "";
      const items = Array.isArray(record.items)
        ? record.items.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        : [];

      if (!chapter) {
        return null;
      }

      return {
        chapter,
        items,
      };
    })
    .filter((item): item is PlanChapter => item !== null);
};

export const renderStructuredValue = (value: unknown) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return <p className="whitespace-pre-line text-sm leading-6 text-gray-600 dark:text-gray-300">{value}</p>;
  }

  if (Array.isArray(value)) {
    return (
      <ul className="space-y-2">
        {value.map((item, index) => (
          <li key={index} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
            {typeof item === "string" ? item : JSON.stringify(item)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <pre className="overflow-x-auto rounded-2xl bg-gray-50 p-4 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
};
