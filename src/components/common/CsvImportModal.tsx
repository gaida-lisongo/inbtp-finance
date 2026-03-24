"use client";

import { type ChangeEvent, type ReactNode, useMemo, useState } from "react";

import FileInput from "@/components/form/input/FileInput";
import AppLoader from "@/components/common/AppLoader";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

export type CsvImportPreviewBase = {
  rowNumber: number;
  isValid: boolean;
  error: string | null;
};

export type CsvImportColumn<T extends CsvImportPreviewBase> = {
  label: string;
  render: (row: T) => ReactNode;
};

export type CsvImportResult = {
  ok: boolean;
  message: string;
};

export type CsvImportHelpers = {
  reportProgress: (current: number, total: number) => void;
};

type CsvImportModalProps<T extends CsvImportPreviewBase> = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  expectedColumns: string[];
  templateFileName: string;
  templateRows: string[][];
  previewColumns: CsvImportColumn<T>[];
  parseRow: (rowData: Record<string, string>, rowNumber: number) => T;
  onImport: (rows: T[], helpers: CsvImportHelpers) => Promise<CsvImportResult>;
  inputLabel?: string;
  stepDescription?: string;
  templateDescription?: string;
  importButtonLabel?: string;
  progressMessage?: (current: number, total: number) => string;
  stepOneContent?: ReactNode;
  stepTwoSummaryContent?: ReactNode;
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

const normalizeCsvCell = (value: string) => value.replace(/\\n/g, "\n").trim();

const downloadCsvTemplate = (rows: string[][], fileName: string) => {
  const csvContent = rows
    .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export default function CsvImportModal<T extends CsvImportPreviewBase>({
  isOpen,
  onClose,
  title,
  expectedColumns,
  templateFileName,
  templateRows,
  previewColumns,
  parseRow,
  onImport,
  inputLabel = "Fichier CSV",
  stepDescription = "Etape 1 sur 3",
  templateDescription = "Un fichier exemple pre-rempli pour accelerer la saisie.",
  importButtonLabel = "Lancer l'import",
  progressMessage,
  stepOneContent,
  stepTwoSummaryContent,
}: CsvImportModalProps<T>) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<T[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const validRows = useMemo(() => rows.filter((row) => row.isValid), [rows]);
  const hasErrors = rows.some((row) => !row.isValid);

  const resetState = () => {
    setStep(1);
    setMessage("");
    setFileName("");
    setRows([]);
    setIsRunning(false);
    setProgress({ current: 0, total: 0 });
  };

  const handleClose = () => {
    if (isRunning) {
      return;
    }

    resetState();
    onClose();
  };

  const inputId = `${title.replace(/\s+/g, "-").toLowerCase()}-csv`;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");
    setFileName(file.name);

    const fileContent = await file.text();
    const lines = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setRows([]);
      setMessage("Le fichier CSV doit contenir un en-tete et au moins une ligne.");
      return;
    }

    const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
    const missingHeaders = expectedColumns.filter((header) => !headers.includes(header));

    if (missingHeaders.length > 0) {
      setRows([]);
      setMessage(`Colonnes manquantes dans le CSV: ${missingHeaders.join(", ")}`);
      return;
    }

    const parsedRows = lines.slice(1).map((line, index) => {
      const values = parseCsvLine(line);
      const rowData = Object.fromEntries(
        headers.map((header, headerIndex) => [header, normalizeCsvCell(values[headerIndex] ?? "")]),
      );

      return parseRow(rowData, index + 2);
    });

    setRows(parsedRows);
    setStep(2);
  };

  const handleImport = async () => {
    if (validRows.length === 0) {
      setMessage("Aucune ligne valide a importer.");
      return;
    }

    setStep(3);
    setMessage("");
    setIsRunning(true);
    setProgress({ current: 0, total: validRows.length });

    const result = await onImport(validRows, {
      reportProgress: (current, total) => setProgress({ current, total }),
    });

    setMessage(result.message);
    setIsRunning(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="m-4 max-w-[900px]">
      <div className="p-6 sm:p-8">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">{title}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {step === 1 ? stepDescription : `Etape ${step} sur 3`}
          </p>
        </div>

        {step === 1 ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
              {stepOneContent ? <div className="mb-5">{stepOneContent}</div> : null}
              <Label htmlFor={inputId}>{inputLabel}</Label>
              <FileInput id={inputId} accept=".csv,text/csv" onChange={handleFileChange} className="mt-2" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Colonnes attendues : <code>{expectedColumns.join(",")}</code>
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => downloadCsvTemplate(templateRows, templateFileName)}
                  className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
                >
                  Telecharger le modele CSV
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">{templateDescription}</span>
              </div>
            </div>

            {message ? (
              <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                {message}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400">
              Fichier : {fileName || "Aucun fichier"} | Lignes valides : {validRows.length} / {rows.length}
            </div>

            {stepTwoSummaryContent ? (
              <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                {stepTwoSummaryContent}
              </div>
            ) : null}

            {hasErrors ? (
              <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400">
                Certaines lignes sont invalides. Elles ne seront pas inserees.
              </div>
            ) : null}

            <div className="max-h-[360px] overflow-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <Table>
                <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                  <TableRow>
                    {["Ligne", ...previewColumns.map((column) => column.label), "Etat"].map((label) => (
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
                  {rows.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {row.rowNumber}
                      </TableCell>
                      {previewColumns.map((column) => (
                        <TableCell
                          key={`${row.rowNumber}-${column.label}`}
                          className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400"
                        >
                          {column.render(row)}
                        </TableCell>
                      ))}
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

        {step === 3 ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 dark:border-gray-800 dark:bg-white/[0.02]">
              <AppLoader
                message={
                  isRunning
                    ? progressMessage?.(progress.current, progress.total) ??
                      `Import en cours ${progress.current}/${progress.total}`
                    : message || "Import termine"
                }
                fullscreen
              />

              <div className="mx-auto mt-4 max-w-xl">
                <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all duration-300"
                    style={{
                      width:
                        progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : "0%",
                    }}
                  />
                </div>
                <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
                  {progress.current} sur {progress.total} creation(s) finalisee(s)
                </p>
              </div>
            </div>

            {message && !isRunning ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  progress.current === progress.total && progress.total > 0
                    ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400"
                    : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
                }`}
              >
                {message}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
          {step > 1 && step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
            >
              Retour
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleClose}
            disabled={isRunning}
            className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
          >
            {step === 3 && !isRunning ? "Fermer" : "Annuler"}
          </button>

          {step === 2 ? (
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={validRows.length === 0}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importButtonLabel}
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
