import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF Test | Dashboard Agents",
  description: "Page de test pour generer des PDF custom.",
};

export default async function FormElements() {
  return (
    <div className="p-15">
      <PageBreadcrumb pageTitle="PDF Test" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Utilise le endpoint ci-dessous pour generer un PDF en nouvel onglet.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/pdf/home/generate"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Generer PDF (default)
          </a>
          <a
            href="/pdf/home/generate?title=Custom%20PDF&text=Bonjour%20depuis%20Dashboard%20Agents"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.04]"
          >
            Generer PDF (custom)
          </a>
        </div>
      </div>
    </div>
  );
}
