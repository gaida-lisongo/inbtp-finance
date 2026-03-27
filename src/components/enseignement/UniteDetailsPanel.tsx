"use client";

import Link from "next/link";

import ComponentCard from "@/components/common/ComponentCard";
import FormSubmitButton from "@/components/common/FormSubmitButton";
import EnseignementRealtimeSync from "@/components/enseignement/EnseignementRealtimeSync";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import type { CoursRecord, MatiereRecord, UniteRecord } from "@/lib/utils/supabase/enseignement";

type UniteDetailsPanelProps = {
  anneeId: string;
  promotionId: string;
  unite: UniteRecord;
  matieres: MatiereRecord[];
  coursByMatiereId: Record<string, CoursRecord | null>;
  createMatiereAction: (formData: FormData) => Promise<void>;
  deleteMatiereAction: (formData: FormData) => Promise<void>;
};

export default function UniteDetailsPanel({
  anneeId,
  promotionId,
  unite,
  matieres,
  coursByMatiereId,
  createMatiereAction,
  deleteMatiereAction,
}: UniteDetailsPanelProps) {
  const matiereModal = useModal();
  const uniteCredits = unite.credits ?? 0;
  const usedCredits = matieres.reduce((total, matiere) => total + (matiere.credits ?? 0), 0);
  const remainingCredits = Math.max(uniteCredits - usedCredits, 0);
  const canCreateMatiere = remainingCredits > 0;

  return (
    <>
      <EnseignementRealtimeSync />

      <ComponentCard
        title={unite.designation || "Unite"}
        desc="Definissez ici les elements constitutifs de l'unite d'enseignement selectionnee."
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Code</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">{unite.code || "Sans code"}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Credits UE</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">{uniteCredits}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Credits repartis</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">{usedCredits}</p>
            </div>
            <div className="flex items-center justify-end">
              <Button onClick={matiereModal.openModal} disabled={!canCreateMatiere}>
                Ajouter une matiere
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
            Credits restants a repartir: <span className="font-semibold text-gray-800 dark:text-white/90">{remainingCredits}</span>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Matiere
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Credits
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Cours
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {matieres.map((matiere) => (
                  <TableRow key={matiere.id}>
                    <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {matiere.designation || "Matiere sans designation"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {matiere.credits ?? 0}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {coursByMatiereId[matiere.id] ? "Associe" : "Non configure"}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/ce/unite?annee=${anneeId}&promotion=${promotionId}&unite=${unite.id}&matiere=${matiere.id}`}
                          className="text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          {coursByMatiereId[matiere.id] ? "Voir le cours" : "Associer un cours"}
                        </Link>
                        <form action={deleteMatiereAction}>
                          <input type="hidden" name="id" value={matiere.id} />
                          <input type="hidden" name="annee" value={anneeId} />
                          <input type="hidden" name="promotion" value={promotionId} />
                          <input type="hidden" name="unite" value={unite.id} />
                          <FormSubmitButton
                            idleLabel="Supprimer"
                            pendingLabel="Suppression..."
                            variant="danger"
                            className="px-0 py-0"
                          />
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {matieres.length === 0 ? (
                  <TableRow>
                    <td colSpan={4} className="px-5 py-10 text-sm text-gray-500 dark:text-gray-400">
                      Aucun element constitutif enregistre pour cette unite.
                    </td>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </ComponentCard>

      <Modal isOpen={matiereModal.isOpen} onClose={matiereModal.closeModal} className="m-4 max-w-[640px]">
        <div className="p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Nouvelle matiere</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Ajoutez un element constitutif a l&apos;unite en cours sans depasser ses credits.
          </p>

          <form action={createMatiereAction} className="mt-6 grid gap-5">
            <input type="hidden" name="annee" value={anneeId} />
            <input type="hidden" name="promotion" value={promotionId} />
            <input type="hidden" name="unite" value={unite.id} />
            <input type="hidden" name="unite_id" value={unite.id} />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="matiere-designation">
                Designation
              </label>
              <input
                id="matiere-designation"
                name="designation"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Ex. TD Algorithmique"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="matiere-credits">
                Credits
              </label>
              <input
                id="matiere-credits"
                name="credits"
                type="number"
                min="0"
                max={remainingCredits}
                step="1"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="0"
                disabled={!canCreateMatiere}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Maximum autorise pour cette saisie: {remainingCredits} credit(s).
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={matiereModal.closeModal}
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Annuler
              </button>
              <FormSubmitButton
                idleLabel="Creer la matiere"
                pendingLabel="Creation..."
                disabled={!canCreateMatiere}
              />
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
