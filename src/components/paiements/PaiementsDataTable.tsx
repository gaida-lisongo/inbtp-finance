"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CsvImportModal, {
  type CsvImportColumn,
  type CsvImportHelpers,
  type CsvImportPreviewBase,
} from "@/components/common/CsvImportModal";
import AppLoader from "@/components/common/AppLoader";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  bulkCreatePaiementsAction,
  deletePaiementAction,
  savePaiementAction,
  type PaiementActionResult,
  type PaiementBulkInput,
} from "@/app/(admin)/paiements/[modaliteId]/actions";

export type PaiementRecord = {
  id: string;
  created_at: string | null;
  montant: number | null;
  status: string | null;
  orderNumber: string | null;
  etudiant_id: string | null;
  modalite_id: number | null;
  etudiantNom: string | null;
  etudiantMatricule: string | null;
};

export type PaiementEtudiantOption = {
  id: string;
  nom: string | null;
  matricule: string | null;
};

type PaiementsDataTableProps = {
  modaliteId: string;
  paiements: PaiementRecord[];
  etudiants: PaiementEtudiantOption[];
};

type CsvPreviewRow = CsvImportPreviewBase & {
  etudiantId: string;
  etudiantLabel: string;
  matricule: string;
  orderNumber: string;
  montant: string;
  montantValue: number;
};

const initialActionState: PaiementActionResult = {
  ok: true,
  message: "",
};

const formatCurrency = (value: number | null) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const normalizeMatricule = (value: string) => value.replace(/\s+/g, "");

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export default function PaiementsDataTable({
  modaliteId,
  paiements,
  etudiants,
}: PaiementsDataTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingPaiement, setEditingPaiement] = useState<PaiementRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<PaiementActionResult>(initialActionState);

  const filteredPaiements = useMemo(
    () =>
      paiements.filter((paiement) =>
        [
          paiement.orderNumber ?? "",
          paiement.etudiantNom ?? "",
          paiement.etudiantMatricule ?? "",
          paiement.status ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase()),
      ),
    [paiements, searchTerm],
  );

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setEditingPaiement(null);
    setActionState(initialActionState);
  };

  const openCreateModal = () => {
    setEditingPaiement(null);
    setActionState(initialActionState);
    setIsModalOpen(true);
  };

  const openEditModal = (paiement: PaiementRecord) => {
    setEditingPaiement(paiement);
    setActionState(initialActionState);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionState(initialActionState);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await savePaiementAction(formData);
    setActionState(result);
    setIsSubmitting(false);

    if (result.ok) {
      closeModal();
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce paiement ?")) {
      return;
    }

    setActionState(initialActionState);
    setIsDeletingId(id);

    const result = await deletePaiementAction({
      id,
      modaliteId,
    });

    setActionState(result);
    setIsDeletingId(null);

    if (result.ok) {
      router.refresh();
    }
  };

  const parseCsvRow = (rowData: Record<string, string>, rowNumber: number): CsvPreviewRow => {
    const matricule = normalizeMatricule(String(rowData.matricule ?? "").trim());
    const orderNumber = String(rowData.ordernumber ?? rowData.orderNumber ?? "").trim();
    const montant = String(rowData.montant ?? "").trim();
    const montantValue = Number(montant.replace(",", "."));
    const etudiant = etudiants.find(
      (item) => normalizeMatricule((item.matricule ?? "").trim()).toLowerCase() === matricule.toLowerCase(),
    );

    const error = !matricule
      ? "Matricule manquant"
      : !etudiant
      ? "Etudiant introuvable"
      : !orderNumber
      ? "Numero de commande manquant"
      : !Number.isFinite(montantValue) || montantValue <= 0
      ? "Montant invalide"
      : null;

    return {
      rowNumber,
      etudiantId: etudiant?.id ?? "",
      etudiantLabel: etudiant?.nom ?? "-",
      matricule,
      orderNumber,
      montant,
      montantValue,
      isValid: !error,
      error,
    };
  };

  const previewColumns: CsvImportColumn<CsvPreviewRow>[] = [
    { label: "Etudiant", render: (row) => row.etudiantLabel || "-" },
    { label: "Matricule", render: (row) => row.matricule || "-" },
    { label: "Commande", render: (row) => row.orderNumber || "-" },
    { label: "Montant", render: (row) => row.montant || "-" },
  ];

  const handleBulkImport = async (
    rows: CsvPreviewRow[],
    { reportProgress }: CsvImportHelpers,
  ) => {
    const chunkSize = 10;
    let inserted = 0;

    reportProgress(0, rows.length);

    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize);
      const payload: PaiementBulkInput[] = chunk.map((row) => ({
        etudiantId: row.etudiantId,
        matricule: row.matricule,
        montant: row.montantValue,
        orderNumber: row.orderNumber,
      }));

      const result = await bulkCreatePaiementsAction(modaliteId, payload);

      if (!result.ok) {
        return {
          ok: false,
          message: result.message,
        };
      }

      inserted += result.insertedCount;
      reportProgress(inserted, rows.length);
    }

    router.refresh();

    return {
      ok: true,
      message: `${inserted} paiement(s) importe(s) avec succes.`,
    };
  };

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-sm">
          <Label htmlFor="paiements-search">Recherche</Label>
          <InputField
            id="paiements-search"
            placeholder="Etudiant, matricule, commande ou statut"
            defaultValue={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Nouveau paiement
          </button>
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
                {["Etudiant", "Matricule", "Commande", "Montant", "Statut", "Creation", "Actions"].map((label) => (
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
              {filteredPaiements.length > 0 ? (
                filteredPaiements.map((paiement) => (
                  <TableRow key={paiement.id}>
                    <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {paiement.etudiantNom ?? "Etudiant inconnu"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {paiement.etudiantMatricule ?? "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {paiement.orderNumber ?? "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(paiement.montant)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {paiement.status ?? "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(paiement.created_at)}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(paiement)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={isDeletingId === paiement.id}
                          onClick={() => void handleDelete(paiement.id)}
                          className="rounded-lg border border-error-200 px-3 py-2 text-sm font-medium text-error-700 transition hover:bg-error-50 disabled:opacity-50 dark:border-error-500/30 dark:text-error-300 dark:hover:bg-error-500/10"
                        >
                          {isDeletingId === paiement.id ? "Suppression..." : "Supprimer"}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    Aucun paiement ne correspond a votre recherche.
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
              <AppLoader message="Enregistrement du paiement" fullscreen />
            </div>
          ) : null}

          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {editingPaiement ? "Modifier le paiement" : "Nouveau paiement"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              La creation passe par l&apos;edge function de paiement.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <input type="hidden" name="id" value={editingPaiement?.id ?? ""} />
            <input type="hidden" name="modaliteId" value={modaliteId} />

            <div className="grid grid-cols-1 gap-5">
              <div>
                <Label htmlFor="etudiantId">Etudiant</Label>
                <select
                  id="etudiantId"
                  name="etudiantId"
                  defaultValue={editingPaiement?.etudiant_id ?? ""}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  <option value="">Selectionnez un etudiant</option>
                  {etudiants.map((etudiant) => (
                    <option key={etudiant.id} value={etudiant.id}>
                      {(etudiant.nom ?? "Etudiant")} · {etudiant.matricule ?? "-"}
                    </option>
                  ))}
                </select>
                {actionState.errors?.etudiantId ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.etudiantId}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="orderNumber">Numero de commande</Label>
                  <InputField
                    id="orderNumber"
                    name="orderNumber"
                    defaultValue={editingPaiement?.orderNumber ?? ""}
                  />
                  {actionState.errors?.orderNumber ? (
                    <p className="mt-1.5 text-xs text-error-500">{actionState.errors.orderNumber}</p>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor="montant">Montant</Label>
                  <InputField
                    id="montant"
                    name="montant"
                    type="number"
                    step={0.01}
                    defaultValue={editingPaiement?.montant ?? ""}
                  />
                  {actionState.errors?.montant ? (
                    <p className="mt-1.5 text-xs text-error-500">{actionState.errors.montant}</p>
                  ) : null}
                </div>
              </div>

              {editingPaiement ? (
                <div>
                  <Label htmlFor="status">Statut</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={editingPaiement.status ?? "pending"}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                  >
                    <option value="pending">pending</option>
                    <option value="success">success</option>
                    <option value="failed">failed</option>
                  </select>
                  {actionState.errors?.status ? (
                    <p className="mt-1.5 text-xs text-error-500">{actionState.errors.status}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {editingPaiement ? "Mettre a jour" : "Creer"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <CsvImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Import CSV des paiements"
        expectedColumns={["matricule", "ordernumber", "montant"]}
        templateFileName="modele-paiements.csv"
        templateRows={[
          ["matricule", "orderNumber", "montant"],
          ["23 45 678", "CMD-0001", "50"],
          ["24 01 112", "CMD-0002", "100"],
        ]}
        previewColumns={previewColumns}
        parseRow={parseCsvRow}
        onImport={handleBulkImport}
        progressMessage={(current, total) => `Creation des paiements ${current}/${total}`}
      />
    </>
  );
}
