"use client";

import Link from "next/link";
import { useState } from "react";

import ComponentCard from "@/components/common/ComponentCard";
import FormSubmitButton from "@/components/common/FormSubmitButton";
import EnseignementRealtimeSync from "@/components/enseignement/EnseignementRealtimeSync";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useModal } from "@/hooks/useModal";
import { PlusIcon } from "@/icons";
import type { SemestreRecord, UniteRecord } from "@/lib/utils/supabase/enseignement";

type SemestreWithUnites = SemestreRecord & {
  unites: UniteRecord[];
};

type ChargeEnseignementPanelProps = {
  anneeId: string;
  promotionId: string;
  semestres: SemestreWithUnites[];
  createSemestreAction: (formData: FormData) => Promise<void>;
  updateSemestreAction: (formData: FormData) => Promise<void>;
  deleteSemestreAction: (formData: FormData) => Promise<void>;
  createUniteAction: (formData: FormData) => Promise<void>;
  deleteUniteAction: (formData: FormData) => Promise<void>;
};

export default function ChargeEnseignementPanel({
  anneeId,
  promotionId,
  semestres,
  createSemestreAction,
  updateSemestreAction,
  deleteSemestreAction,
  createUniteAction,
  deleteUniteAction,
}: ChargeEnseignementPanelProps) {
  const semestreModal = useModal();
  const editSemestreModal = useModal();
  const uniteModal = useModal();
  const [selectedSemestreId, setSelectedSemestreId] = useState(semestres[0]?.id ?? "");
  const activeSemestre = semestres.find((semestre) => semestre.id === selectedSemestreId) ?? semestres[0] ?? null;
  const activeSemestreCredits = activeSemestre?.credits ?? 0;
  const usedSemestreCredits = activeSemestre?.unites.reduce((total, unite) => total + (unite.credits ?? 0), 0) ?? 0;

  return (
    <>
      <EnseignementRealtimeSync />

      <ComponentCard
        title="Semestres et unites d'enseignement"
        desc="Organisez la promotion par semestres, puis rattachez les unites d'enseignement avant de descendre dans le detail des matieres."
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
            {semestres.map((semestre) => {
              const isActive = semestre.id === activeSemestre?.id;

              return (
                <button
                  key={semestre.id}
                  type="button"
                  onClick={() => setSelectedSemestreId(semestre.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                  }`}
                >
                  {semestre.designation || "Semestre"}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-white/15 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
                    {semestre.unites.length}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={semestreModal.openModal}
              className="inline-flex items-center gap-2 rounded-full border border-dashed border-brand-300 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10"
            >
              <PlusIcon className="size-4" />
              Ajouter un semestre
            </button>
          </div>

          {activeSemestre ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Semestre actif</p>
                  <p className="mt-2 text-lg font-semibold text-gray-800 dark:text-white/90">
                    {activeSemestre.designation || "Semestre"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Credits: {activeSemestreCredits}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    UE enregistrees: {usedSemestreCredits} / {activeSemestreCredits}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" variant="outline" onClick={editSemestreModal.openModal}>
                    Modifier le semestre
                  </Button>
                  <Button size="sm" onClick={uniteModal.openModal}>
                    Ajouter une unite
                  </Button>
                  <form action={deleteSemestreAction}>
                    <input type="hidden" name="id" value={activeSemestre.id} />
                    <input type="hidden" name="annee" value={anneeId} />
                    <input type="hidden" name="promotion" value={promotionId} />
                    <FormSubmitButton
                      idleLabel="Supprimer le semestre"
                      pendingLabel="Suppression..."
                      variant="danger"
                      className="px-0 py-0"
                    />
                  </form>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                    <TableRow>
                      <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Unite
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Code
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Credits
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHeader>

                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {activeSemestre.unites.map((unite) => (
                      <TableRow key={unite.id}>
                        <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                          {unite.designation || "Unite sans designation"}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {unite.code || "Sans code"}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {unite.credits ?? 0}
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <div className="flex justify-end gap-3">
                            <Link
                              href={`/ce/unite?annee=${anneeId}&promotion=${promotionId}&unite=${unite.id}`}
                              className="text-sm font-medium text-brand-500 hover:text-brand-600"
                            >
                              Detail
                            </Link>
                            <form action={deleteUniteAction}>
                              <input type="hidden" name="id" value={unite.id} />
                              <input type="hidden" name="annee" value={anneeId} />
                              <input type="hidden" name="promotion" value={promotionId} />
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

                    {activeSemestre.unites.length === 0 ? (
                      <TableRow>
                        <td colSpan={4} className="px-5 py-10 text-sm text-gray-500 dark:text-gray-400">
                          Aucune unite enregistree pour ce semestre.
                        </td>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Aucun semestre enregistre pour cette promotion. Commencez par en creer un.
            </div>
          )}
        </div>
      </ComponentCard>

      <Modal isOpen={semestreModal.isOpen} onClose={semestreModal.closeModal} className="m-4 max-w-[640px]">
        <div className="p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Nouveau semestre</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Ajoutez un semestre dans la promotion active depuis cette modale.
          </p>

          <form action={createSemestreAction} className="mt-6 grid gap-5">
            <input type="hidden" name="annee" value={anneeId} />
            <input type="hidden" name="promotion" value={promotionId} />
            <input type="hidden" name="programme_id" value={promotionId} />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="semestre-designation">
                Designation
              </label>
              <input
                id="semestre-designation"
                name="designation"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Ex. Semestre 1"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="semestre-credits">
                Credits
              </label>
              <input
                id="semestre-credits"
                name="credits"
                type="number"
                min="0"
                step="1"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="0"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={semestreModal.closeModal}
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Annuler
              </button>
              <FormSubmitButton idleLabel="Creer le semestre" pendingLabel="Creation..." />
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={editSemestreModal.isOpen} onClose={editSemestreModal.closeModal} className="m-4 max-w-[640px]">
        <div className="p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Modifier le semestre</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Mettez a jour la designation et les credits du semestre selectionne.
          </p>

          <form action={updateSemestreAction} className="mt-6 grid gap-5">
            <input type="hidden" name="id" value={activeSemestre?.id ?? ""} />
            <input type="hidden" name="annee" value={anneeId} />
            <input type="hidden" name="promotion" value={promotionId} />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="edit-semestre-designation">
                Designation
              </label>
              <input
                key={activeSemestre?.id}
                id="edit-semestre-designation"
                name="designation"
                defaultValue={activeSemestre?.designation ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Ex. Semestre 1"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="edit-semestre-credits">
                Credits
              </label>
              <input
                key={`${activeSemestre?.id}-credits`}
                id="edit-semestre-credits"
                name="credits"
                type="number"
                min={usedSemestreCredits}
                step="1"
                defaultValue={activeSemestre?.credits ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="0"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum conseille: {usedSemestreCredits} credits deja affectes aux unites.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={editSemestreModal.closeModal}
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Annuler
              </button>
              <FormSubmitButton idleLabel="Enregistrer" pendingLabel="Mise a jour..." />
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={uniteModal.isOpen} onClose={uniteModal.closeModal} className="m-4 max-w-[720px]">
        <div className="p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Nouvelle unite d&apos;enseignement</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Rattachez l&apos;unite au semestre actif pour completer sa structure.
          </p>

          <form action={createUniteAction} className="mt-6 grid gap-5 lg:grid-cols-2">
            <input type="hidden" name="annee" value={anneeId} />
            <input type="hidden" name="promotion" value={promotionId} />
            <input type="hidden" name="semestre_id" value={activeSemestre?.id ?? ""} />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="unite-designation">
                Designation
              </label>
              <input
                id="unite-designation"
                name="designation"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Ex. Algorithmique"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="unite-code">
                Code
              </label>
              <input
                id="unite-code"
                name="code"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="UE-101"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="unite-credits">
                Credits
              </label>
              <input
                id="unite-credits"
                name="credits"
                type="number"
                min="0"
                step="1"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="0"
              />
            </div>

            <div className="flex justify-end gap-3 lg:col-span-2">
              <button
                type="button"
                onClick={uniteModal.closeModal}
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Annuler
              </button>
              <FormSubmitButton idleLabel="Creer l'unite" pendingLabel="Creation..." />
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
