"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  bulkInsertEtudiantsAction,
  bulkCreateEtudiantsEntraUsersAction,
  createEtudiantEntraUserAction,
  deleteEtudiantAction,
  saveEtudiantAction,
  type EtudiantActionResult,
  type EtudiantBulkInput,
} from "@/app/(admin)/etudiants/actions";
import AppLoader from "@/components/common/AppLoader";
import CsvImportModal, {
  type CsvImportColumn,
  type CsvImportHelpers,
  type CsvImportPreviewBase,
} from "@/components/common/CsvImportModal";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

export type EtudiantRecord = {
  id: string;
  created_at: string | null;
  nom: string | null;
  email: string | null;
  matricule: string | null;
  sexe: string | null;
  entraId: string | null;
};

type EtudiantsDataTableProps = {
  etudiants: EtudiantRecord[];
};

type EditingEtudiant = EtudiantRecord | null;

type CsvPreviewRow = CsvImportPreviewBase & {
  nom: string;
  matricule: string;
  sexe: string;
  email: string;
};

const initialActionState: EtudiantActionResult = {
  ok: true,
  message: "",
};

const csvHeaders = ["nom", "matricule", "sexe"];
const csvTemplateRows = [
  ["nom", "matricule", "sexe"],
  ["LISONGO BAITA GAIDA", "23 45 678", "M"],
  ["KABONGO MULELE SARAH", "24 01 112", "F"],
];

const normalizeMatricule = (value: string) => value.replace(/\s+/g, "");

const removeDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const buildStudentEmail = (nom: string, matricule: string) => {
  const normalizedName = removeDiacritics(nom)
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .trim();
  const firstName = normalizedName.split(/\s+/).filter(Boolean)[0] ?? "etudiant";

  return `${firstName}.${normalizeMatricule(matricule).toLowerCase()}@inbtp.ac.cd`;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "Non renseignee";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const getDefaultFormValues = (): Omit<EtudiantRecord, "id" | "created_at" | "email"> => ({
  nom: "",
  matricule: "",
  sexe: "",
  entraId: null,
});

const actionIconButtonClassName =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-300";

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M11.6665 3.33336L16.6665 8.33336M13.1247 1.87515C13.8151 1.1848 14.9346 1.1848 15.625 1.87515L18.1247 4.37484C18.8151 5.0652 18.8151 6.18467 18.1247 6.87502L7.08317 17.9166L2.5 18.3334L2.91683 13.7502L13.1247 1.87515Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const EntraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M10 2.5L16.25 6.04167V13.9583L10 17.5L3.75 13.9583V6.04167L10 2.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 8.75L10 11.25L12.5 8.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M4.1665 5H15.8332M7.49984 2.5H12.4998M8.33317 8.33333V13.3333M11.6665 8.33333V13.3333M5.83317 5L6.24984 15C6.28911 15.9428 7.06563 16.6667 8.00917 16.6667H11.9905C12.934 16.6667 13.7106 15.9428 13.7498 15L14.1665 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function EtudiantsDataTable({ etudiants }: EtudiantsDataTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [entraFilter, setEntraFilter] = useState<"all" | "with_entra" | "without_entra">("all");
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingEtudiant, setEditingEtudiant] = useState<EditingEtudiant>(null);
  const [actionState, setActionState] = useState<EtudiantActionResult>(initialActionState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isProvisioningId, setIsProvisioningId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredEtudiants = useMemo(
    () =>
      etudiants.filter((etudiant) =>
        [etudiant.nom ?? "", etudiant.email ?? "", etudiant.matricule ?? "", etudiant.sexe ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase()) &&
        (entraFilter === "all" ||
          (entraFilter === "with_entra" ? Boolean(etudiant.entraId) : !etudiant.entraId)),
      ),
    [entraFilter, etudiants, searchTerm],
  );

  const currentValues = editingEtudiant ?? {
    id: "",
    created_at: null,
    email: null,
    ...getDefaultFormValues(),
  };
  const selectedEtudiants = filteredEtudiants.filter((etudiant) => selectedIds.includes(etudiant.id));

  const closeCrudModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsCrudModalOpen(false);
    setEditingEtudiant(null);
    setActionState(initialActionState);
  };

  const openCreateModal = () => {
    setEditingEtudiant(null);
    setActionState(initialActionState);
    setIsCrudModalOpen(true);
  };

  const openEditModal = (etudiant: EtudiantRecord) => {
    setEditingEtudiant(etudiant);
    setActionState(initialActionState);
    setIsCrudModalOpen(true);
  };

  const openBulkModal = () => {
    setIsBulkModalOpen(true);
  };

  const handleCrudSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionState(initialActionState);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await saveEtudiantAction(formData);
    setActionState(result);
    setIsSubmitting(false);

    if (result.ok) {
      closeCrudModal();
      router.refresh();
    }
  };

  const handleDelete = async (id: string, nom: string | null, entraId: string | null) => {
    if (!window.confirm(`Supprimer l'etudiant "${nom ?? "Sans nom"}" ?`)) {
      return;
    }

    setActionState(initialActionState);
    setIsDeletingId(id);

    const result = await deleteEtudiantAction({
      id,
      entraId,
    });
    setActionState(result);
    setIsDeletingId(null);

    if (result.ok) {
      router.refresh();
    }
  };

  const handleCreateEntraUser = async (etudiant: EtudiantRecord) => {
    setActionState(initialActionState);
    setIsProvisioningId(etudiant.id);

    const result = await createEtudiantEntraUserAction({
      id: etudiant.id,
      nom: etudiant.nom ?? "",
      matricule: etudiant.matricule ?? "",
      entraId: etudiant.entraId,
    });

    setActionState(result);
    setIsProvisioningId(null);
    if (result.ok) {
      setSelectedIds((currentIds) => currentIds.filter((currentId) => currentId !== etudiant.id));
      router.refresh();
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((currentId) => currentId !== id)
        : [...currentIds, id],
    );
  };

  const toggleSelectAllVisible = () => {
    const selectableIds = filteredEtudiants.filter((etudiant) => !etudiant.entraId).map((etudiant) => etudiant.id);
    const allSelected =
      selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

    setSelectedIds((currentIds) =>
      allSelected
        ? currentIds.filter((id) => !selectableIds.includes(id))
        : [...new Set([...currentIds, ...selectableIds])],
    );
  };

  const handleBulkCreateEntraUsers = async () => {
    if (selectedEtudiants.length === 0) {
      setActionState({
        ok: false,
        message: "Aucun etudiant selectionne pour Entra ID.",
      });
      return;
    }

    setActionState(initialActionState);
    setIsProvisioningId("bulk");

    const result = await bulkCreateEtudiantsEntraUsersAction(
      selectedEtudiants.map((etudiant) => ({
        id: etudiant.id,
        nom: etudiant.nom ?? "",
        matricule: etudiant.matricule ?? "",
        entraId: etudiant.entraId,
      })),
    );

    setActionState(result);
    setIsProvisioningId(null);

    if (result.ok) {
      setSelectedIds([]);
      router.refresh();
    }
  };

  const parseStudentCsvRow = (rowData: Record<string, string>, rowNumber: number): CsvPreviewRow => {
    const nom = String(rowData.nom ?? "").trim();
    const matricule = normalizeMatricule(String(rowData.matricule ?? "").trim());
    const sexe = String(rowData.sexe ?? "").trim();
    const error = !nom
      ? "Nom manquant"
      : !matricule
      ? "Matricule manquant"
      : !sexe
      ? "Sexe manquant"
      : null;

    return {
      rowNumber,
      nom,
      matricule,
      sexe,
      email: error ? "" : buildStudentEmail(nom, matricule),
      isValid: !error,
      error,
    };
  };

  const studentPreviewColumns: CsvImportColumn<CsvPreviewRow>[] = [
    {
      label: "Nom",
      render: (row) => <span className="text-gray-800 dark:text-white/90">{row.nom || "-"}</span>,
    },
    { label: "Matricule", render: (row) => row.matricule || "-" },
    { label: "Sexe", render: (row) => row.sexe || "-" },
    { label: "Email genere", render: (row) => row.email || "-" },
  ];

  const handleBulkInsert = async (
    validRows: CsvPreviewRow[],
    { reportProgress }: CsvImportHelpers,
  ) => {
    const chunkSize = 20;
    let inserted = 0;

    reportProgress(0, validRows.length);

    for (let index = 0; index < validRows.length; index += chunkSize) {
      const chunk = validRows.slice(index, index + chunkSize);
      const payload: EtudiantBulkInput[] = chunk.map((row) => ({
        nom: row.nom,
        matricule: row.matricule,
        sexe: row.sexe,
      }));

      const result = await bulkInsertEtudiantsAction(payload);

      if (!result.ok) {
        return {
          ok: false,
          message: result.message,
        };
      }

      inserted += result.insertedCount;
      reportProgress(inserted, validRows.length);
    }

    router.refresh();

    return {
      ok: true,
      message: `${inserted} etudiant(s) importe(s) avec succes.`,
    };
  };

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid w-full gap-4 lg:max-w-3xl lg:grid-cols-2">
          <div>
            <Label htmlFor="etudiants-search">Recherche</Label>
            <InputField
              id="etudiants-search"
              placeholder="Nom, matricule, email ou sexe"
              defaultValue={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="entra-filter">Filtre Entra ID</Label>
            <select
              id="entra-filter"
              value={entraFilter}
              onChange={(event) =>
                setEntraFilter(event.target.value as "all" | "with_entra" | "without_entra")
              }
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            >
              <option value="all">Tous les etudiants</option>
              <option value="without_entra">Sans compte Entra ID</option>
              <option value="with_entra">Avec compte Entra ID</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Button variant="outline" onClick={openBulkModal}>
            Import CSV
          </Button>
          <Button
            variant="outline"
            disabled={selectedEtudiants.length === 0 || isProvisioningId === "bulk"}
            onClick={() => void handleBulkCreateEntraUsers()}
          >
            {isProvisioningId === "bulk"
              ? "Provisioning Entra..."
              : `Inserer selection Entra ID (${selectedEtudiants.length})`}
          </Button>
          <Button onClick={openCreateModal}>Nouvel etudiant</Button>
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
          <p>{actionState.message}</p>
          {actionState.details?.length ? (
            <div className="mt-2 space-y-1 font-medium">
              {actionState.details.map((detail) => (
                <p key={detail} className="break-all">
                  {detail}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  <input
                    type="checkbox"
                    checked={
                      filteredEtudiants.filter((etudiant) => !etudiant.entraId).length > 0 &&
                      filteredEtudiants
                        .filter((etudiant) => !etudiant.entraId)
                        .every((etudiant) => selectedIds.includes(etudiant.id))
                    }
                    onChange={toggleSelectAllVisible}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
                  />
                </TableCell>
                {["Nom", "Matricule", "Email genere", "Sexe", "Entra ID", "Creation", "Actions"].map((label) => (
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
              {filteredEtudiants.length > 0 ? (
                filteredEtudiants.map((etudiant) => (
                  <TableRow key={etudiant.id}>
                    <TableCell className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(etudiant.id)}
                        disabled={Boolean(etudiant.entraId)}
                        onChange={() => toggleSelection(etudiant.id)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {etudiant.nom ?? "Sans nom"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {etudiant.matricule ?? "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {etudiant.email ?? "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {etudiant.sexe ?? "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      {etudiant.entraId ? (
                        <span className="inline-flex rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
                          Synchronise
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-warning-50 px-2.5 py-1 text-xs font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
                          Non cree
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(etudiant.created_at)}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          title="Modifier"
                          aria-label="Modifier"
                          className={actionIconButtonClassName}
                          onClick={() => openEditModal(etudiant)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          title={etudiant.entraId ? "Deja synchronise dans Entra ID" : "Inserer dans Entra ID"}
                          aria-label={etudiant.entraId ? "Deja synchronise dans Entra ID" : "Inserer dans Entra ID"}
                          disabled={isProvisioningId === etudiant.id || Boolean(etudiant.entraId)}
                          className={actionIconButtonClassName}
                          onClick={() => void handleCreateEntraUser(etudiant)}
                        >
                          <EntraIcon />
                        </button>
                        <button
                          type="button"
                          title="Supprimer"
                          aria-label="Supprimer"
                          disabled={isDeletingId === etudiant.id}
                          className={actionIconButtonClassName}
                          onClick={() => void handleDelete(etudiant.id, etudiant.nom, etudiant.entraId)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Aucun etudiant ne correspond a votre recherche.
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal isOpen={isCrudModalOpen} onClose={closeCrudModal} className="m-4 max-w-[700px]">
        <div className="relative p-6 sm:p-8">
          {isSubmitting ? (
            <div className="absolute inset-0 z-10 rounded-3xl bg-white/90 backdrop-blur-sm dark:bg-gray-900/90">
              <AppLoader message="Enregistrement de l'etudiant" fullscreen />
            </div>
          ) : null}

          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {editingEtudiant ? "Modifier l'etudiant" : "Nouvel etudiant"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              L&apos;email est genere automatiquement a partir du nom et du matricule.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleCrudSubmit}>
            <input type="hidden" name="id" value={currentValues.id} />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="nom">Nom complet</Label>
                <InputField id="nom" name="nom" defaultValue={currentValues.nom ?? ""} />
                {actionState.errors?.nom ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.nom}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="matricule">Matricule</Label>
                <InputField id="matricule" name="matricule" defaultValue={currentValues.matricule ?? ""} />
                {actionState.errors?.matricule ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.matricule}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="sexe">Sexe</Label>
                <select
                  id="sexe"
                  name="sexe"
                  defaultValue={currentValues.sexe ?? ""}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  <option value="">Selectionnez</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
                {actionState.errors?.sexe ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.sexe}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
              Email prevu :{" "}
              {currentValues.nom && currentValues.matricule
                ? buildStudentEmail(currentValues.nom, currentValues.matricule)
                : "saisissez le nom et le matricule"}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
              <button
                type="button"
                onClick={closeCrudModal}
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
                {isSubmitting ? "Enregistrement..." : editingEtudiant ? "Mettre a jour" : "Creer"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <CsvImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Import CSV des etudiants"
        expectedColumns={csvHeaders}
        templateFileName="modele-etudiants.csv"
        templateRows={csvTemplateRows}
        previewColumns={studentPreviewColumns}
        parseRow={parseStudentCsvRow}
        onImport={handleBulkInsert}
        progressMessage={(current, total) => `Creation des etudiants ${current}/${total}`}
      />
    </>
  );
}
