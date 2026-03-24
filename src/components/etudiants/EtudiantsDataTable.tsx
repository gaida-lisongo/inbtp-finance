"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  bulkInsertEtudiantsAction,
  deleteEtudiantAction,
  saveEtudiantAction,
  type EtudiantActionResult,
  type EtudiantBulkInput,
} from "@/app/(admin)/etudiants/actions";
import AppLoader from "@/components/common/AppLoader";
import Label from "@/components/form/Label";
import FileInput from "@/components/form/input/FileInput";
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
};

type EtudiantsDataTableProps = {
  etudiants: EtudiantRecord[];
};

type EditingEtudiant = EtudiantRecord | null;

type CsvPreviewRow = {
  rowNumber: number;
  nom: string;
  matricule: string;
  sexe: string;
  email: string;
  isValid: boolean;
  error: string | null;
};

const initialActionState: EtudiantActionResult = {
  ok: true,
  message: "",
};

const csvHeaders = ["nom", "matricule", "sexe"];

const normalizeMatricule = (value: string) => value.replace(/\s+/g, "");

const removeDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const buildStudentEmail = (nom: string, matricule: string) => {
  const normalizedName = removeDiacritics(nom)
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .trim();
  const parts = normalizedName.split(/\s+/).filter(Boolean);
  const firstInitial = parts[0]?.charAt(0) ?? "x";

  return `${firstInitial}.${normalizeMatricule(matricule).toLowerCase()}@inbtp.ac.cd`;
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

const parseCsvLine = (line: string) => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

const getDefaultFormValues = (): Omit<EtudiantRecord, "id" | "created_at" | "email"> => ({
  nom: "",
  matricule: "",
  sexe: "",
});

export default function EtudiantsDataTable({ etudiants }: EtudiantsDataTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingEtudiant, setEditingEtudiant] = useState<EditingEtudiant>(null);
  const [actionState, setActionState] = useState<EtudiantActionResult>(initialActionState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [bulkStep, setBulkStep] = useState<1 | 2 | 3>(1);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkRows, setBulkRows] = useState<CsvPreviewRow[]>([]);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [isBulkRunning, setIsBulkRunning] = useState(false);

  const filteredEtudiants = useMemo(
    () =>
      etudiants.filter((etudiant) =>
        [etudiant.nom ?? "", etudiant.email ?? "", etudiant.matricule ?? "", etudiant.sexe ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase()),
      ),
    [etudiants, searchTerm],
  );

  const currentValues = editingEtudiant ?? {
    id: "",
    created_at: null,
    email: null,
    ...getDefaultFormValues(),
  };

  const validBulkRows = bulkRows.filter((row) => row.isValid);
  const hasBulkErrors = bulkRows.some((row) => !row.isValid);

  const closeCrudModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsCrudModalOpen(false);
    setEditingEtudiant(null);
    setActionState(initialActionState);
  };

  const closeBulkModal = () => {
    if (isBulkRunning) {
      return;
    }

    setIsBulkModalOpen(false);
    setBulkStep(1);
    setBulkMessage("");
    setBulkFileName("");
    setBulkRows([]);
    setBulkProgress({ current: 0, total: 0 });
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
    closeBulkModal();
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

  const handleDelete = async (id: string, nom: string | null) => {
    if (!window.confirm(`Supprimer l'etudiant "${nom ?? "Sans nom"}" ?`)) {
      return;
    }

    setActionState(initialActionState);
    setIsDeletingId(id);

    const result = await deleteEtudiantAction(id);
    setActionState(result);
    setIsDeletingId(null);

    if (result.ok) {
      router.refresh();
    }
  };

  const handleCsvFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setBulkMessage("");
    setBulkFileName(file.name);

    const fileContent = await file.text();
    const lines = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setBulkMessage("Le fichier CSV doit contenir un en-tete et au moins une ligne.");
      setBulkRows([]);
      return;
    }

    const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
    const missingHeaders = csvHeaders.filter((header) => !headers.includes(header));

    if (missingHeaders.length > 0) {
      setBulkMessage(`Colonnes manquantes dans le CSV: ${missingHeaders.join(", ")}`);
      setBulkRows([]);
      return;
    }

    const parsedRows = lines.slice(1).map((line, index) => {
      const values = parseCsvLine(line);
      const rowData = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
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
        rowNumber: index + 2,
        nom,
        matricule,
        sexe,
        email: error ? "" : buildStudentEmail(nom, matricule),
        isValid: !error,
        error,
      };
    });

    setBulkRows(parsedRows);
    setBulkStep(2);
  };

  const handleBulkInsert = async () => {
    if (validBulkRows.length === 0) {
      setBulkMessage("Aucune ligne valide a importer.");
      return;
    }

    setBulkStep(3);
    setIsBulkRunning(true);
    setBulkMessage("");
    setBulkProgress({ current: 0, total: validBulkRows.length });

    const chunkSize = 20;
    let inserted = 0;

    for (let index = 0; index < validBulkRows.length; index += chunkSize) {
      const chunk = validBulkRows.slice(index, index + chunkSize);
      const payload: EtudiantBulkInput[] = chunk.map((row) => ({
        nom: row.nom,
        matricule: row.matricule,
        sexe: row.sexe,
      }));

      const result = await bulkInsertEtudiantsAction(payload);

      if (!result.ok) {
        setBulkMessage(result.message);
        setIsBulkRunning(false);
        return;
      }

      inserted += result.insertedCount;
      setBulkProgress({ current: inserted, total: validBulkRows.length });
    }

    setBulkMessage(`${inserted} etudiant(s) importe(s) avec succes.`);
    setIsBulkRunning(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-sm">
          <Label htmlFor="etudiants-search">Recherche</Label>
          <InputField
            id="etudiants-search"
            placeholder="Nom, matricule, email ou sexe"
            defaultValue={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Button variant="outline" onClick={openBulkModal}>
            Import CSV
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
          {actionState.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              <TableRow>
                {["Nom", "Matricule", "Email genere", "Sexe", "Creation", "Actions"].map((label) => (
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
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(etudiant.created_at)}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(etudiant)}>
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isDeletingId === etudiant.id}
                          onClick={() => void handleDelete(etudiant.id, etudiant.nom)}
                        >
                          {isDeletingId === etudiant.id ? "Suppression..." : "Supprimer"}
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

      <Modal isOpen={isBulkModalOpen} onClose={closeBulkModal} className="m-4 max-w-[900px]">
        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Import CSV des etudiants
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Etape {bulkStep} sur 3
            </p>
          </div>

          {bulkStep === 1 ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
                <Label htmlFor="etudiants-csv">Fichier CSV</Label>
                <FileInput onChange={handleCsvFileChange} className="mt-2" />
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Colonnes attendues : <code>nom,matricule,sexe</code>
                </p>
              </div>

              {bulkMessage ? (
                <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                  {bulkMessage}
                </div>
              ) : null}
            </div>
          ) : null}

          {bulkStep === 2 ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400">
                Fichier : {bulkFileName || "Aucun fichier"} | Lignes valides : {validBulkRows.length} / {bulkRows.length}
              </div>

              {hasBulkErrors ? (
                <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400">
                  Certaines lignes sont invalides. Elles ne seront pas inserees.
                </div>
              ) : null}

              <div className="max-h-[360px] overflow-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                <Table>
                  <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                    <TableRow>
                      {["Ligne", "Nom", "Matricule", "Sexe", "Email genere", "Etat"].map((label) => (
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
                    {bulkRows.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {row.rowNumber}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm text-gray-800 dark:text-white/90">
                          {row.nom || "-"}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {row.matricule || "-"}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {row.sexe || "-"}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {row.email || "-"}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              row.isValid
                                ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                                : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
                            }`}
                          >
                            {row.isValid ? "Valide" : row.error}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          {bulkStep === 3 ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 dark:border-gray-800 dark:bg-white/[0.02]">
                <AppLoader
                  message={
                    isBulkRunning
                      ? `Creation des etudiants ${bulkProgress.current}/${bulkProgress.total}`
                      : bulkMessage || "Import termine"
                  }
                  fullscreen
                />

                <div className="mx-auto mt-4 max-w-xl">
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-300"
                      style={{
                        width:
                          bulkProgress.total > 0
                            ? `${(bulkProgress.current / bulkProgress.total) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    {bulkProgress.current} sur {bulkProgress.total} creation(s) finalisee(s)
                  </p>
                </div>
              </div>

              {bulkMessage && !isBulkRunning ? (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    bulkProgress.current === bulkProgress.total && bulkProgress.total > 0
                      ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400"
                      : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
                  }`}
                >
                  {bulkMessage}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
            {bulkStep > 1 && bulkStep < 3 ? (
              <button
                type="button"
                onClick={() => setBulkStep(1)}
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
              >
                Retour
              </button>
            ) : null}

            <button
              type="button"
              onClick={closeBulkModal}
              disabled={isBulkRunning}
              className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
            >
              {bulkStep === 3 && !isBulkRunning ? "Fermer" : "Annuler"}
            </button>

            {bulkStep === 2 ? (
              <button
                type="button"
                onClick={() => void handleBulkInsert()}
                disabled={validBulkRows.length === 0}
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Lancer l&apos;import
              </button>
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
}
