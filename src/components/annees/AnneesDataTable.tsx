"use client";

import { FormEvent, startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import AppLoader from "@/components/common/AppLoader";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  deleteAnneeAction,
  saveAnneeAction,
  type AnneeActionResult,
} from "@/app/(admin)/(others-pages)/annees/actions";

export type AnneeRecord = {
  id: string;
  created_at: string | null;
  designation: string;
  debut: string;
  fin: string;
  slug: string;
  status: string;
};

type AnneesDataTableProps = {
  annees: AnneeRecord[];
};

type EditingAnnee = AnneeRecord | null;

const initialActionState: AnneeActionResult = {
  ok: true,
  message: "",
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "Non renseignee";
  }

  const normalizedDate = value.includes("T") ? value : `${value}T00:00:00`;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(normalizedDate));
};

const getStatusBadgeClassName = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "active") {
    return "bg-success-50 text-success-700 ring-success-600/20 dark:bg-success-500/10 dark:text-success-400";
  }

  if (normalizedStatus === "cloturee" || normalizedStatus === "closed") {
    return "bg-gray-100 text-gray-700 ring-gray-500/20 dark:bg-white/10 dark:text-gray-300";
  }

  return "bg-warning-50 text-warning-700 ring-warning-600/20 dark:bg-warning-500/10 dark:text-warning-400";
};

const getDefaultFormValues = (): Omit<AnneeRecord, "id" | "created_at"> => ({
  designation: "",
  debut: "",
  fin: "",
  slug: "",
  status: "active",
});

export default function AnneesDataTable({ annees }: AnneesDataTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnee, setEditingAnnee] = useState<EditingAnnee>(null);
  const [actionState, setActionState] = useState<AnneeActionResult>(initialActionState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const filteredAnnees = annees.filter((annee) => {
    const haystack = [
      annee.designation,
      annee.slug,
      annee.status,
      annee.debut,
      annee.fin,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchTerm.trim().toLowerCase());
  });

  const openCreateModal = () => {
    setEditingAnnee(null);
    setActionState(initialActionState);
    setIsModalOpen(true);
  };

  const openEditModal = (annee: AnneeRecord) => {
    setEditingAnnee(annee);
    setActionState(initialActionState);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setEditingAnnee(null);
    setActionState(initialActionState);
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);

    const result = await saveAnneeAction(formData);
    setActionState(result);

    if (result.ok) {
      setIsSubmitting(false);
      closeModal();
      router.refresh();
      return;
    }

    setIsSubmitting(false);
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionState(initialActionState);

    const formData = new FormData(event.currentTarget);
    await handleSubmit(formData);
  };

  const handleDelete = (id: string, designation: string) => {
    if (!window.confirm(`Supprimer l'annee academique "${designation}" ?`)) {
      return;
    }

    setActionState(initialActionState);
    setIsDeletingId(id);

    startTransition(async () => {
      const result = await deleteAnneeAction(id);
      setActionState(result);
      setIsDeletingId(null);

      if (result.ok) {
        router.refresh();
      }
    });
  };

  const currentValues = editingAnnee ?? {
    id: "",
    created_at: null,
    ...getDefaultFormValues(),
  };

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-sm">
          <Label htmlFor="annees-search">Recherche</Label>
          <InputField
            id="annees-search"
            placeholder="Designation, slug ou statut"
            defaultValue={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-end">
          <Button onClick={openCreateModal}>Nouvelle annee academique</Button>
        </div>
      </div>

      {actionState.message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            actionState.ok
              ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400"
              : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
          }`}
        >
          {actionState.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              <TableRow>
                {["Designation", "Periode", "Slug", "Statut", "Creation", "Actions"].map((label) => (
                  <TableCell
                    key={label}
                    isHeader
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredAnnees.length > 0 ? (
                filteredAnnees.map((annee) => (
                  <TableRow key={annee.id}>
                    <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {annee.designation}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(annee.debut)} - {formatDate(annee.fin)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {annee.slug}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadgeClassName(
                          annee.status,
                        )}`}
                      >
                        {annee.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(annee.created_at)}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(annee)}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isDeletingId === annee.id}
                          onClick={() => handleDelete(annee.id, annee.designation)}
                        >
                          {isDeletingId === annee.id ? "Suppression..." : "Supprimer"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Aucune annee academique ne correspond a votre recherche.
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} className="m-4 max-w-[700px]">
        <div className="relative p-6 sm:p-8">
          {isSubmitting ? (
            <div className="absolute inset-0 z-10 rounded-3xl bg-white/90 backdrop-blur-sm dark:bg-gray-900/90">
              <AppLoader message="Enregistrement de l'annee academique" fullscreen />
            </div>
          ) : null}

          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {editingAnnee ? "Modifier l&apos;annee academique" : "Nouvelle annee academique"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Renseignez les informations essentielles de l&apos;annee academique.
            </p>
          </div>

          <form
            key={editingAnnee?.id ?? "create"}
            className="space-y-5"
            onSubmit={handleFormSubmit}
          >
            <input type="hidden" name="id" value={currentValues.id} />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="designation">Designation</Label>
                <InputField
                  id="designation"
                  name="designation"
                  placeholder="Ex: 2025-2026"
                  defaultValue={currentValues.designation}
                />
                {actionState.errors?.designation ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.designation}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="debut">Date de debut</Label>
                <InputField
                  id="debut"
                  name="debut"
                  type="date"
                  defaultValue={currentValues.debut}
                />
                {actionState.errors?.debut ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.debut}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="fin">Date de fin</Label>
                <InputField id="fin" name="fin" type="date" defaultValue={currentValues.fin} />
                {actionState.errors?.fin ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.fin}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <InputField
                  id="slug"
                  name="slug"
                  placeholder="Laisse vide pour generation automatique"
                  defaultValue={currentValues.slug}
                />
                {actionState.errors?.slug ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.slug}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="status">Statut</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={currentValues.status}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="cloturee">cloturee</option>
                </select>
                {actionState.errors?.status ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.status}</p>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Enregistrement..." : editingAnnee ? "Mettre a jour" : "Creer"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
