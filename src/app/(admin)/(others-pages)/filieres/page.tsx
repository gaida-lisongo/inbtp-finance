import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { deleteFiliereAction, saveFiliereAction } from "@/app/(admin)/(others-pages)/filieres/actions";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { getFiliereById, getFilieres } from "@/lib/utils/supabase/filieres";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export const metadata: Metadata = {
  title: "Filieres | Dashboard Agents",
  description: "Gestion des filieres par les organisateurs",
};

type FilieresPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
    edit?: string;
  }>;
};

export default async function FilieresPage({ searchParams }: FilieresPageProps) {
  const [user, params] = await Promise.all([getAuthenticatedUser(), searchParams]);

  if (!user || !user.canManageYears) {
    redirect("/signin?error=access_denied");
  }

  const filieres = await getFilieres();
  const editingFiliere = params.edit ? await getFiliereById(params.edit) : null;

  return (
    <div>
      <PageBreadcrumb pageTitle="Filieres" />

      <div className="space-y-6">
        {params.status === "success" ? (
          <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
            Operation effectuee avec succes.
          </div>
        ) : null}

        {params.status === "error" && params.message ? (
          <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
            {params.message}
          </div>
        ) : null}

        <ComponentCard title={editingFiliere ? "Modifier une filiere" : "Nouvelle filiere"} desc="Gestion des filieres disponibles pour les programmes.">
          <form action={saveFiliereAction} className="grid gap-5 lg:grid-cols-2">
            <input type="hidden" name="id" value={editingFiliere?.id ?? ""} />

            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="designation">
                Designation
              </label>
              <input
                id="designation"
                name="designation"
                defaultValue={editingFiliere?.designation ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="slug">
                Slug
              </label>
              <input
                id="slug"
                name="slug"
                defaultValue={editingFiliere?.slug ?? ""}
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
                defaultValue={editingFiliere?.description ?? ""}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="lg:col-span-2 flex gap-3">
              <button type="submit" className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white hover:bg-brand-600">
                {editingFiliere ? "Mettre a jour" : "Creer"}
              </button>
              {editingFiliere ? (
                <a
                  href="/filieres"
                  className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Annuler
                </a>
              ) : null}
            </div>
          </form>
        </ComponentCard>

        <ComponentCard title="Liste des filieres">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Designation
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Slug
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
                {filieres.map((filiere) => (
                  <TableRow key={filiere.id}>
                    <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {filiere.designation || "Sans designation"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {filiere.slug || "N/A"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {filiere.description || "Aucune description"}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <a href={`/filieres?edit=${filiere.id}`} className="text-sm font-medium text-brand-500 hover:text-brand-600">
                          Modifier
                        </a>
                        <form action={deleteFiliereAction}>
                          <input type="hidden" name="id" value={filiere.id} />
                          <button type="submit" className="text-sm font-medium text-error-500 hover:text-error-600">
                            Supprimer
                          </button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filieres.length === 0 ? (
                  <TableRow>
                    <td colSpan={4} className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                      Aucune filiere enregistree.
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
