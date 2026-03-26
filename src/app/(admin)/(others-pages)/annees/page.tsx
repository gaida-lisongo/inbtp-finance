import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { deleteAnneeAction, saveAnneeAction } from "@/app/(admin)/(others-pages)/annees/actions";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { getAnneeById, getAnnees } from "@/lib/utils/supabase/annees";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export const metadata: Metadata = {
  title: "Gestion des annees | Dashboard Agents",
  description: "Administration des annees academiques pour les organisateurs",
};

type AnneesPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
    edit?: string;
  }>;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
};

const getMessage = (status?: string, message?: string) => {
  if (status !== "error") {
    return message;
  }

  if (message === "access_denied") {
    return "Acces refuse a cette page.";
  }

  return message;
};

export default async function AnneesPage({ searchParams }: AnneesPageProps) {
  const [user, params] = await Promise.all([getAuthenticatedUser(), searchParams]);

  if (!user || !user.canManageYears) {
    redirect("/signin?error=access_denied");
  }

  const annees = await getAnnees();
  const editingAnnee = params.edit ? await getAnneeById(params.edit) : null;
  const feedbackMessage = getMessage(params.status, params.message);

  return (
    <div>
      <PageBreadcrumb pageTitle="Annees" />

      <div className="space-y-6">
        {params.status === "success" ? (
          <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
            Operation effectuee avec succes.
          </div>
        ) : null}

        {params.status === "error" && feedbackMessage ? (
          <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
            {feedbackMessage}
          </div>
        ) : null}

        <ComponentCard
          title={editingAnnee ? "Modifier une annee" : "Nouvelle annee"}
          desc="Les organisateurs definissent ici les annees disponibles dans le systeme."
        >
          <form action={saveAnneeAction} className="grid gap-5 lg:grid-cols-2">
            <input type="hidden" name="id" value={editingAnnee?.id ?? ""} />

            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="designation">
                Designation
              </label>
              <input
                id="designation"
                name="designation"
                defaultValue={editingAnnee?.designation ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Ex: 2025 - 2026"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="date_debut">
                Date debut
              </label>
              <input
                id="date_debut"
                name="date_debut"
                type="date"
                defaultValue={editingAnnee?.date_debut ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="date_fin">
                Date fin
              </label>
              <input
                id="date_fin"
                name="date_fin"
                type="date"
                defaultValue={editingAnnee?.date_fin ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={editingAnnee?.description ?? ""}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Description de l'annee"
              />
            </div>

            <div className="lg:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                {editingAnnee ? "Mettre a jour" : "Creer l'annee"}
              </button>
              {editingAnnee ? (
                <a
                  href="/annees"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Annuler
                </a>
              ) : null}
            </div>
          </form>
        </ComponentCard>

        <ComponentCard title="Liste des annees" desc="Vue d'ensemble des annees configurees par les organisateurs.">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Designation
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Debut
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Fin
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Description
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {annees.map((annee) => (
                  <TableRow key={annee.id}>
                    <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {annee.designation || "Sans designation"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(annee.date_debut)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(annee.date_fin)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {annee.description || "Aucune description"}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <a
                          href={`/annees?edit=${annee.id}`}
                          className="text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          Modifier
                        </a>
                        <form action={deleteAnneeAction}>
                          <input type="hidden" name="id" value={annee.id} />
                          <button type="submit" className="text-sm font-medium text-error-500 hover:text-error-600">
                            Supprimer
                          </button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {annees.length === 0 ? (
                  <TableRow>
                    <td colSpan={5} className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                      Aucune annee enregistree.
                    </td>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
