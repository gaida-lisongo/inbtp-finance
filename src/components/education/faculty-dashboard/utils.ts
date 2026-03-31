import type { FacultyDashboardCommande } from "@/lib/utils/supabase/faculte-dashboard";

export const CATEGORY_STYLES: Record<string, { accent: string; badge: string; ring: string }> = {
  sujet: {
    accent: "from-sky-500 to-cyan-400",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    ring: "ring-sky-200 dark:ring-sky-500/20",
  },
  sujets: {
    accent: "from-sky-500 to-cyan-400",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    ring: "ring-sky-200 dark:ring-sky-500/20",
  },
  stage: {
    accent: "from-emerald-500 to-teal-400",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    ring: "ring-emerald-200 dark:ring-emerald-500/20",
  },
  stages: {
    accent: "from-emerald-500 to-teal-400",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    ring: "ring-emerald-200 dark:ring-emerald-500/20",
  },
  session: {
    accent: "from-amber-500 to-orange-400",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    ring: "ring-amber-200 dark:ring-amber-500/20",
  },
  laboratoire: {
    accent: "from-violet-500 to-fuchsia-400",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    ring: "ring-violet-200 dark:ring-violet-500/20",
  },
  laboratoires: {
    accent: "from-violet-500 to-fuchsia-400",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    ring: "ring-violet-200 dark:ring-violet-500/20",
  },
  document: {
    accent: "from-slate-500 to-slate-400",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
    ring: "ring-slate-200 dark:ring-slate-500/20",
  },
  documents: {
    accent: "from-slate-500 to-slate-400",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
    ring: "ring-slate-200 dark:ring-slate-500/20",
  },
  autres: {
    accent: "from-rose-500 to-pink-400",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    ring: "ring-rose-200 dark:ring-rose-500/20",
  },
};

export const formatDate = (value: string | null) => {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(new Date(value));
};

export const formatAmount = (value: number | null) => {
  if (typeof value !== "number") {
    return "N/A";
  }

  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

const buildCsv = (rows: FacultyDashboardCommande[]) => {
  const header = ["orderNumber", "product", "categorie", "student", "email", "status", "total", "created_at"];
  const values = rows.map((row) => [
    row.orderNumber ?? row.id,
    row.product ?? "",
    row.categoryLabel,
    row.studentName,
    row.studentEmail ?? "",
    row.status ?? "",
    row.total ?? "",
    row.created_at,
  ]);

  return [header, ...values]
    .map((line) => line.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
};

export function exportRows(filename: string, rows: FacultyDashboardCommande[]) {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
