import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { deleteProgrammeAction, saveProgrammeAction } from "@/app/(admin)/(others-pages)/programmes/actions";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { getAnnees } from "@/lib/utils/supabase/annees";
import { getFilieres } from "@/lib/utils/supabase/filieres";
import { getProgrammeById, getProgrammes } from "@/lib/utils/supabase/programmes";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export const metadata: Metadata = {
  title: "Programmes | Dashboard Agents",
  description: "Gestion des programmes par les organisateurs",
};

type ProgrammesPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
    edit?: string;
  }>;
};

export default async function ProgrammesPage({ searchParams }: ProgrammesPageProps) {
  const [user, params] = await Promise.all([getAuthenticatedUser(), searchParams]);

  if (!user || !user.canManageProgramme) {
    redirect("/signin?error=access_denied");
  }

  const [programmes, filieres, annees] = await Promise.all([getProgrammes(), getFilieres(), getAnnees()]);
  const editingProgramme = params.edit ? await getProgrammeById(params.edit) : null;

  return (
    <div>
      <PageBreadcrumb pageTitle="Programmes" />

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

        <ComponentCard title={editingProgramme ? "Modifier un programme" : "Nouveau programme"} desc="Les programmes alimentent ensuite les classes visibles dans le menu des agents.">
          <form action={saveProgrammeAction} className="grid gap-5 lg:grid-cols-2">
            <input type="hidden" name="id" value={editingProgramme?.id ?? ""} />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="designation">
                Designation
              </label>
              <input
                id="designation"
                name="designation"
                defaultValue={editingProgramme?.designation ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="slug">
                Slug
              </label>
              <input
                id="slug"
                name="slug"
                defaultValue={editingProgramme?.slug ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="filiere_id">
                Filiere
              </label>
              <select
                id="filiere_id"
                name="filiere_id"
                defaultValue={editingProgramme?.filiere_id ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">Selectionner une filiere</option>
                {filieres.map((filiere) => (
                  <option key={filiere.id} value={filiere.id}>
                    {filiere.designation || "Filiere sans nom"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="annee_id">
                Annee
              </label>
              <select
                id="annee_id"
                name="annee_id"
                defaultValue={editingProgramme?.annee_id ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">Selectionner une annee</option>
                {annees.map((annee) => (
                  <option key={annee.id} value={annee.id}>
                    {annee.designation || "Annee sans nom"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="groupe_id">
                Groupe
              </label>
              <input
                id="groupe_id"
                name="groupe_id"
                defaultValue={editingProgramme?.groupe_id ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="systeme">
                Systeme
              </label>
              <input
                id="systeme"
                name="systeme"
                defaultValue={editingProgramme?.systeme ?? ""}
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
                defaultValue={editingProgramme?.description ?? ""}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="lg:col-span-2 flex gap-3">
              <button type="submit" className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white hover:bg-brand-600">
                {editingProgramme ? "Mettre a jour" : "Creer"}
              </button>
              {editingProgramme ? (
                <a
                  href="/programmes"
                  className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Annuler
                </a>
              ) : null}
            </div>
          </form>
        </ComponentCard>

        <ComponentCard title="Liste des programmes">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Designation
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Filiere
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Annee
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Systeme
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {programmes.map((programme) => (
                  <TableRow key={programme.id}>
                    <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {programme.designation || "Sans designation"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {programme.filiereDesignation || "Aucune filiere"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {programme.anneeDesignation || "Aucune annee"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {programme.systeme || "N/A"}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <a href={`/programmes?edit=${programme.id}`} className="text-sm font-medium text-brand-500 hover:text-brand-600">
                          Modifier
                        </a>
                        <form action={deleteProgrammeAction}>
                          <input type="hidden" name="id" value={programme.id} />
                          <button type="submit" className="text-sm font-medium text-error-500 hover:text-error-600">
                            Supprimer
                          </button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {programmes.length === 0 ? (
                  <TableRow>
                    <td colSpan={5} className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                      Aucun programme enregistre.
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
