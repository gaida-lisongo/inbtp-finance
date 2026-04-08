"use client";

interface ExportActivityNotesFormProps {
  activityId: string;
  buttonText?: string;
  buttonClassName?: string;
}

export function ExportActivityNotesForm({ 
  activityId, 
  buttonText = "Exporter les notes",
  buttonClassName = "inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
}: ExportActivityNotesFormProps) {
  return (
    <form action={`/api/teacher/activities/${encodeURIComponent(activityId)}/notes/export`} method="GET">
      <button
        type="submit"
        className={buttonClassName}
      >
        {buttonText}
      </button>
    </form>
  );
}
