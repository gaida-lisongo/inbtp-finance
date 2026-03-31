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
    style: "currency",
    currency: "USD",
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

export function printCategoryReport(title: string, rows: FacultyDashboardCommande[]) {
  const printableWindow = window.open("", "_blank", "width=1200,height=900");

  if (!printableWindow) {
    return;
  }

  const body = rows
    .map(
      (row) => `
        <tr>
          <td>${row.orderNumber ?? row.id}</td>
          <td>${row.product ?? "Produit académique"}</td>
          <td>${row.studentName}</td>
          <td>${row.studentEmail ?? "Email indisponible"}</td>
          <td>${row.status ?? "Sans statut"}</td>
          <td>${formatAmount(row.total)}</td>
          <td>${formatDate(row.created_at)}</td>
        </tr>
      `,
    )
    .join("");

  printableWindow.document.write(`
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>Reporting ${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          p { margin: 0 0 24px; color: #4b5563; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; text-align: left; vertical-align: top; }
          th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
          @media print {
            body { margin: 16px; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>${rows.length} commande(s) pour cette ressource académique.</p>
        <table>
          <thead>
            <tr>
              <th>Commande</th>
              <th>Produit</th>
              <th>Etudiant</th>
              <th>Email</th>
              <th>Statut</th>
              <th>Montant</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>
  `);
  printableWindow.document.close();
  printableWindow.focus();
  printableWindow.print();
}
