import Link from "next/link";

import { bulkAttachProgrammesToTeamsAction, deleteProgrammeAction, saveProgrammeAction } from "@/app/(admin)/(others-pages)/programmes/actions";
import ComponentCard from "@/components/common/ComponentCard";
import FormSubmitButton from "@/components/common/FormSubmitButton";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { AnneeRecord } from "@/lib/utils/supabase/annees";
import type { FiliereRecord } from "@/lib/utils/supabase/filieres";
import type { ProgrammeRecord, ProgrammeWithRelations } from "@/lib/utils/supabase/programmes";

type ProgrammesManagementPanelProps = {
  programmes: ProgrammeWithRelations[];
  filieres: FiliereRecord[];
  annees: AnneeRecord[];
  editingProgramme: ProgrammeRecord | null;
  mode?: string;
  status?: string;
  message?: string;
};

const getProgrammeLabel = (programme: { designation: string | null; slug: string | null }) =>
  programme.designation || programme.slug || "Sans designation";

const getTeamBadgeClassName = (hasTeam: boolean) =>
  hasTeam
    ? "bg-success-50 text-success-700 ring-success-600/20 dark:bg-success-500/10 dark:text-success-300"
    : "bg-warning-50 text-warning-700 ring-warning-600/20 dark:bg-warning-500/10 dark:text-warning-300";

export default function ProgrammesManagementPanel({
  programmes,
  filieres,
  annees,
  editingProgramme,
  mode,
  status,
  message,
}: ProgrammesManagementPanelProps) {
  const isCreating = mode === "create";
  const isEditing = Boolean(editingProgramme);
  const showForm = isCreating || isEditing;
  const linkedProgrammesCount = programmes.filter((programme) => Boolean(programme.groupe_id)).length;

  return (
    <div className="space-y-6">
      {status === "success" ? (
        <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
          {message || "Operation effectuee avec succes."}
        </div>
      ) : null}

      {status === "error" && message ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
          {message}
        </div>
      ) : null}

      <ComponentCard
        title="Liste des promotions"
        desc="La table reste la vue principale. Cochez une ou plusieurs promotions pour lancer l'association bulk des equipes Teams."
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Promotions</p>
                <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{programmes.length}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Associees a Teams</p>
                <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{linkedProgrammesCount}</p>
              </div>
            </div>

            <Link
              href="/programmes?mode=create"
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Nouvelle promotion
            </Link>
          </div>

          <div className="space-y-4">
            <form
              id="bulk-attach-programmes-form"
              action={bulkAttachProgrammesToTeamsAction}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-300 px-4 py-3 dark:border-gray-700"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">
                L&apos;association Teams utilise la `slug` de chaque promotion pour creer le groupe Microsoft 365 correspondant.
              </p>
              <FormSubmitButton
                idleLabel="Associer les promotions cochees"
                pendingLabel="Association Teams..."
                className="px-4 py-2.5"
              />
            </form>

            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Selection
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Promotion
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Slug
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Filiere
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Annee
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Teams
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {programmes.map((programme) => {
                    const hasTeam = Boolean(programme.groupe_id);

                    return (
                      <TableRow key={programme.id}>
                        <TableCell className="px-5 py-4 text-sm">
                          <input
                            type="checkbox"
                            name="programme_ids"
                            value={programme.id}
                            form="bulk-attach-programmes-form"
                            disabled={hasTeam || !programme.slug}
                            className="h-4 w-4 rounded border border-gray-300 text-brand-500 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700"
                          />
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                          {getProgrammeLabel(programme)}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{programme.slug || "Non defini"}</TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {programme.filiereDesignation || "Aucune filiere"}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {programme.anneeDesignation || "Aucune annee"}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getTeamBadgeClassName(hasTeam)}`}>
                            {hasTeam ? "Associee" : "A creer"}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <div className="flex justify-end gap-3">
                            <Link href={`/programmes?edit=${programme.id}`} className="text-sm font-medium text-brand-500 hover:text-brand-600">
                              Modifier
                            </Link>
                            <form action={deleteProgrammeAction}>
                              <input type="hidden" name="id" value={programme.id} />
                              <button type="submit" className="text-sm font-medium text-error-500 hover:text-error-600">
                                Supprimer
                              </button>
                            </form>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {programmes.length === 0 ? (
                    <TableRow>
                      <td colSpan={7} className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                        Aucune promotion enregistree.
                      </td>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </ComponentCard>

      {showForm ? (
        <ComponentCard
          title={isEditing ? "Modifier une promotion" : "Nouvelle promotion"}
          desc={
            isEditing
              ? "Mettez a jour les metadonnees de la promotion. L'association Teams se gere depuis la table principale."
              : "A la creation, seule la slug est requise. L'equipe Teams sera associee plus tard depuis la liste."
          }
        >
          <form action={saveProgrammeAction} className="grid gap-5 lg:grid-cols-2">
            <input type="hidden" name="id" value={editingProgramme?.id ?? ""} />

            {isEditing ? (
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
            ) : null}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="slug">
                Slug
              </label>
              <input
                id="slug"
                name="slug"
                required
                defaultValue={editingProgramme?.slug ?? ""}
                placeholder="Ex. l1-info-2026"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            {isEditing ? (
              <>
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

                <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Etat Teams</p>
                  <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                    {editingProgramme?.groupe_id ? "Equipe Teams deja associee" : "Aucune equipe Teams associee"}
                  </p>
                  <p className="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">{editingProgramme?.groupe_id || "Identifiant non renseigne"}</p>
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
              </>
            ) : null}

            <div className="flex gap-3 lg:col-span-2">
              <FormSubmitButton
                idleLabel={isEditing ? "Mettre a jour" : "Creer"}
                pendingLabel={isEditing ? "Mise a jour..." : "Creation..."}
              />
              <Link
                href="/programmes"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Annuler
              </Link>
            </div>
          </form>
        </ComponentCard>
      ) : null}
    </div>
  );
}
