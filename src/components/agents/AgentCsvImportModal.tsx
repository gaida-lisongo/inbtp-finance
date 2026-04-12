"use client";

import React, { useMemo, useState } from "react";

import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import type { AgentRole } from "@/lib/utils/supabase/agents-shared";
import { bulkCreateAgentsAction, type BulkCreateAgentInput, type BulkCreateAgentsResult } from "@/app/actions/agents";
import { detectCsvDelimiter, parseCsv, type CsvDelimiter } from "@/lib/utils/csv/parseCsv";

type CsvStep = 1 | 2 | 3;

type FieldKey = "nom" | "post_nom" | "prenom" | "email" | "grade" | "role";

const fieldLabels: Record<FieldKey, string> = {
  nom: "Nom",
  post_nom: "Post-nom (optionnel)",
  prenom: "Prénom",
  email: "Email",
  grade: "Grade (optionnel)",
  role: "Rôle (optionnel)",
};

const requiredFields: Array<Exclude<FieldKey, "post_nom" | "grade" | "role">> = ["nom", "prenom", "email"];

const allowedRoles: AgentRole[] = ["titulaire", "gestionnaire", "organisateur"];

const normalizeRole = (value: string | null | undefined): AgentRole | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return allowedRoles.includes(normalized as AgentRole) ? (normalized as AgentRole) : null;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier CSV."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(file);
  });

const teacherCsvTemplate = `nom;post_nom;prenom;email;grade;role
Doe;Ngoyi;Jeanne;jeanne.doe@exemple.com;Professeur;titulaire
Mbuyi;Tshilobo;Patrick;patrick.mbuyi@exemple.com;Assistant;titulaire`;

const downloadTeacherCsvTemplate = () => {
  const blob = new Blob([teacherCsvTemplate], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-enseignants.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const makeColumnOptions = (headers: string[]) =>
  headers.map((label, index) => ({ label: label.trim().length > 0 ? label.trim() : `Colonne ${index + 1}`, index }));

const guessMapping = (headers: string[]) => {
  const normalized = headers.map((header) => header.trim().toLowerCase());
  const pick = (candidates: string[]) => {
    const foundIndex = normalized.findIndex((value) => candidates.includes(value));
    return foundIndex >= 0 ? foundIndex : null;
  };

  return {
    nom: pick(["nom", "last name", "lastname", "surname"]),
    post_nom: pick(["post_nom", "postnom", "post-nom", "post nom", "middle name", "middlename"]),
    prenom: pick(["prenom", "prénom", "first name", "firstname", "given name", "givenname"]),
    email: pick(["email", "e-mail", "mail"]),
    grade: pick(["grade", "titre", "title"]),
    role: pick(["role", "rôle", "profil"]),
  } satisfies Record<FieldKey, number | null>;
};

export type AgentCsvImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  existingEmails?: string[];
  onImported?: (result: BulkCreateAgentsResult) => void;
};

export default function AgentCsvImportModal({ isOpen, onClose, existingEmails = [], onImported }: AgentCsvImportModalProps) {
  const [step, setStep] = useState<CsvStep>(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [fileReadError, setFileReadError] = useState<string | null>(null);

  const [delimiterChoice, setDelimiterChoice] = useState<"auto" | CsvDelimiter>("auto");
  const [hasHeaderRow, setHasHeaderRow] = useState(true);

  const delimiter = useMemo(() => {
    if (delimiterChoice !== "auto") {
      return delimiterChoice;
    }
    return detectCsvDelimiter(csvText.slice(0, 4096));
  }, [csvText, delimiterChoice]);

  const parsed = useMemo(() => {
    if (!csvText.trim()) {
      return { headers: [] as string[], rows: [] as string[][] };
    }

    try {
      const rows = parseCsv(csvText, delimiter);
      if (rows.length === 0) {
        return { headers: [] as string[], rows: [] as string[][] };
      }

      const headerRow = hasHeaderRow ? rows[0] ?? [] : [];
      const dataRows = hasHeaderRow ? rows.slice(1) : rows;
      const maxColumns = Math.max(...rows.map((row) => row.length));

      const normalizedHeaders = hasHeaderRow
        ? Array.from({ length: maxColumns }, (_, index) => headerRow[index] ?? `Colonne ${index + 1}`)
        : Array.from({ length: maxColumns }, (_, index) => `Colonne ${index + 1}`);

      const normalizedRows = dataRows.map((row) =>
        Array.from({ length: maxColumns }, (_, index) => (row[index] ?? "").trim())
      );

      return { headers: normalizedHeaders, rows: normalizedRows };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { headers: [] as string[], rows: [] as string[][], error: message };
    }
  }, [csvText, delimiter, hasHeaderRow]);

  const [mapping, setMapping] = useState<Record<FieldKey, number | null>>({
    nom: null,
    post_nom: null,
    prenom: null,
    email: null,
    grade: null,
    role: null,
  });

  const [defaultRole, setDefaultRole] = useState<AgentRole>("titulaire");
  const [skipInvalidRows, setSkipInvalidRows] = useState(true);

  const existingEmailsSet = useMemo(() => {
    return new Set(existingEmails.map((value) => value.trim().toLowerCase()).filter(Boolean));
  }, [existingEmails]);

  const effectiveMapping = useMemo(() => {
    const hasAnySelection = Object.values(mapping).some((value) => value !== null);
    if (hasAnySelection) {
      return mapping;
    }
    if (parsed.headers.length === 0) {
      return mapping;
    }
    return { ...mapping, ...guessMapping(parsed.headers) };
  }, [mapping, parsed.headers]);

  const parseError = fileReadError ?? ((parsed as { error?: string }).error ?? null);

  const resetState = () => {
    setStep(1);
    setCsvFile(null);
    setCsvText("");
    setFileReadError(null);
    setDelimiterChoice("auto");
    setHasHeaderRow(true);
    setSkipInvalidRows(true);
    setDefaultRole("titulaire");
    setMapping({
      nom: null,
      post_nom: null,
      prenom: null,
      email: null,
      grade: null,
      role: null,
    });
    setImportState({ status: "idle", result: null });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const columnOptions = useMemo(() => makeColumnOptions(parsed.headers), [parsed.headers]);

  const mappedRows = useMemo(() => {
    const rows = parsed.rows;
    if (rows.length === 0) {
      return [];
    }

    const fileEmailCounts = new Map<string, number>();
    for (const row of rows) {
      const rawEmail = effectiveMapping.email !== null ? row[effectiveMapping.email] ?? "" : "";
      const normalizedEmail = rawEmail.trim().toLowerCase();
      if (!normalizedEmail) continue;
      fileEmailCounts.set(normalizedEmail, (fileEmailCounts.get(normalizedEmail) ?? 0) + 1);
    }

    return rows.map((row, index) => {
      const read = (key: FieldKey) => {
        const colIndex = effectiveMapping[key];
        if (colIndex === null) {
          return "";
        }
        return (row[colIndex] ?? "").trim();
      };

      const emailValue = read("email");
      const normalizedEmail = emailValue.trim().toLowerCase();
      const roleFromCsv = effectiveMapping.role !== null ? read("role") : "";

      const agent: BulkCreateAgentInput = {
        nom: read("nom"),
        post_nom: effectiveMapping.post_nom === null ? null : read("post_nom") || null,
        prenom: read("prenom"),
        email: emailValue,
        grade: effectiveMapping.grade === null ? null : read("grade") || null,
        role: normalizeRole(roleFromCsv) ?? defaultRole,
      };

      const errors: string[] = [];

      for (const requiredField of requiredFields) {
        if (!agent[requiredField]?.trim()) {
          errors.push(`${fieldLabels[requiredField]} requis`);
        }
      }

      if (agent.email && !isValidEmail(agent.email)) {
        errors.push("Email invalide");
      }

      if (normalizedEmail && existingEmailsSet.has(normalizedEmail)) {
        errors.push("Email déjà présent dans la base");
      }

      if (normalizedEmail && (fileEmailCounts.get(normalizedEmail) ?? 0) > 1) {
        errors.push("Email dupliqué dans le fichier");
      }

      const isEmptyRow = Object.values(agent).every((value) => {
        if (value === null) return true;
        return String(value).trim().length === 0;
      });

      return {
        index,
        agent,
        isEmptyRow,
        errors,
      };
    }).filter((item) => !item.isEmptyRow);
  }, [parsed.rows, effectiveMapping, defaultRole, existingEmailsSet]);

  const validAgents = useMemo(() => mappedRows.filter((row) => row.errors.length === 0).map((row) => row.agent), [mappedRows]);

  const canGoNextFromStep1 = useMemo(() => {
    if (!csvFile || parseError) return false;
    if (mappedRows.length === 0) return false;
    return requiredFields.every((field) => effectiveMapping[field] !== null);
  }, [csvFile, parseError, mappedRows.length, effectiveMapping]);

  const canGoNextFromStep2 = validAgents.length > 0;

  const [importState, setImportState] = useState<{
    status: "idle" | "loading" | "done";
    result: BulkCreateAgentsResult | null;
  }>({ status: "idle", result: null });

  const handlePickFile = async (file: File | null) => {
    setCsvFile(file);
    setImportState({ status: "idle", result: null });
    setFileReadError(null);

    if (!file) {
      setCsvText("");
      return;
    }

    try {
      const text = await readFileAsText(file);
      setCsvText(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setFileReadError(message);
      setCsvText("");
    }
  };

  const handleImport = async () => {
    if (importState.status === "loading") {
      return;
    }

    const agentsToImport = skipInvalidRows ? validAgents : mappedRows.map((row) => row.agent);
    if (agentsToImport.length === 0) {
      return;
    }

    setImportState({ status: "loading", result: null });
    try {
      const result = await bulkCreateAgentsAction(agentsToImport);
      setImportState({ status: "done", result });
      onImported?.(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setImportState({
        status: "done",
        result: { created: [], errors: [{ index: -1, email: null, message }] },
      });
    }
  };

  const previewRows = useMemo(() => mappedRows.slice(0, 10), [mappedRows]);

  const StepHeader = (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Import CSV d&apos;agents</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`rounded-2xl border px-4 py-3 text-left ${
            step === 1
              ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
              : "border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400"
          }`}
        >
          <p className="text-xs uppercase tracking-wide">Etape 1</p>
          <p className="mt-1 text-sm font-semibold">Configuration CSV</p>
        </button>
        <button
          type="button"
          onClick={() => (canGoNextFromStep1 ? setStep(2) : null)}
          className={`rounded-2xl border px-4 py-3 text-left ${
            step === 2
              ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
              : "border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400"
          }`}
        >
          <p className="text-xs uppercase tracking-wide">Etape 2</p>
          <p className="mt-1 text-sm font-semibold">Prévisualisation</p>
        </button>
        <button
          type="button"
          onClick={() => (canGoNextFromStep2 ? setStep(3) : null)}
          className={`rounded-2xl border px-4 py-3 text-left ${
            step === 3
              ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
              : "border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400"
          }`}
        >
          <p className="text-xs uppercase tracking-wide">Etape 3</p>
          <p className="mt-1 text-sm font-semibold">Chargement</p>
        </button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <div className="space-y-6 p-6">
        {StepHeader}

        {parseError ? (
          <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
            {parseError}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <Label>Fichier CSV</Label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => handlePickFile(event.target.files?.[0] ?? null)}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-hidden focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={downloadTeacherCsvTemplate}>
                    Télécharger modèle enseignants
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Format: CSV avec en-têtes (séparateur ;).</p>
                </div>
                {csvFile ? (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{csvFile.name}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Séparateur</Label>
                  <select
                    value={delimiterChoice}
                    onChange={(event) => setDelimiterChoice(event.target.value as "auto" | CsvDelimiter)}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-hidden focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    disabled={!csvFile}
                  >
                    <option value="auto">Auto</option>
                    <option value=",">Virgule (,)</option>
                    <option value=";">Point-virgule (;)</option>
                    <option value="\t">Tabulation</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                  {csvFile ? (
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      Séparateur détecté: <span className="font-medium">{delimiter === "\t" ? "Tabulation" : delimiter}</span>
                    </p>
                  ) : null}
                </div>

                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={hasHeaderRow}
                      onChange={(event) => setHasHeaderRow(event.target.checked)}
                      disabled={!csvFile}
                    />
                    Première ligne = en-têtes
                  </label>
                </div>
              </div>
            </div>

            {columnOptions.length > 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Mapping des colonnes</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Sélectionnez quelles colonnes du CSV correspondent aux champs agent.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {(Object.keys(fieldLabels) as FieldKey[]).map((key) => (
                    <div key={key}>
                      <Label>{fieldLabels[key]}</Label>
                      <select
                        value={effectiveMapping[key] === null ? "" : String(effectiveMapping[key])}
                        onChange={(event) =>
                          setMapping((current) => ({
                            ...current,
                            [key]: event.target.value === "" ? null : Number(event.target.value),
                          }))
                        }
                        className="mt-1.5 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-hidden focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      >
                        <option value="">{key === "post_nom" || key === "grade" || key === "role" ? "(Vide)" : "Sélectionner..."}</option>
                        {columnOptions.map((option) => (
                          <option key={`${key}-${option.index}`} value={option.index}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <Label>Rôle par défaut</Label>
                  <select
                    value={defaultRole}
                    onChange={(event) => setDefaultRole(event.target.value as AgentRole)}
                    className="mt-1.5 w-full max-w-xs rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-hidden focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="titulaire">Titulaire</option>
                    <option value="gestionnaire">Gestionnaire</option>
                    <option value="organisateur">Organisateur</option>
                  </select>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Utilisé si la colonne rôle est vide ou non reconnue.
                  </p>
                </div>

                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Lignes détectées: <span className="font-medium">{mappedRows.length}</span>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Fermer
              </Button>
              <Button type="button" onClick={() => setStep(2)} disabled={!canGoNextFromStep1}>
                Continuer
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Prévisualisation</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {validAgents.length} ligne(s) valide(s) / {mappedRows.length} au total (aperçu limité à 10).
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={skipInvalidRows}
                    onChange={(event) => setSkipInvalidRows(event.target.checked)}
                  />
                  Importer uniquement les lignes valides
                </label>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="max-w-full overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600 dark:bg-white/[0.03] dark:text-gray-300">
                      <tr>
                        <th className="px-4 py-3 font-medium">#</th>
                        <th className="px-4 py-3 font-medium">Nom complet</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Grade</th>
                        <th className="px-4 py-3 font-medium">Rôle</th>
                        <th className="px-4 py-3 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {previewRows.map((row) => {
                        const fullName = [row.agent.prenom, row.agent.post_nom, row.agent.nom].filter(Boolean).join(" ").trim();
                        return (
                          <tr key={row.index} className="text-gray-700 dark:text-gray-200">
                            <td className="px-4 py-3">{row.index + 1}</td>
                            <td className="px-4 py-3">{fullName || "—"}</td>
                            <td className="px-4 py-3">{row.agent.email || "—"}</td>
                            <td className="px-4 py-3">{row.agent.grade || "—"}</td>
                            <td className="px-4 py-3">{row.agent.role || "—"}</td>
                            <td className="px-4 py-3">
                              {row.errors.length === 0 ? (
                                <span className="text-success-600 dark:text-success-400">OK</span>
                              ) : (
                                <span className="text-error-600 dark:text-error-400">{row.errors.join(", ")}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {previewRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            Aucune donnée à afficher.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button type="button" onClick={() => setStep(3)} disabled={!canGoNextFromStep2}>
                Continuer
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Chargement</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {skipInvalidRows ? `${validAgents.length} ligne(s) seront importées.` : `${mappedRows.length} ligne(s) seront importées.`}
              </p>

              {importState.status === "done" && importState.result ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200">
                    Créés: <span className="font-semibold">{importState.result.created.length}</span> — Erreurs:{" "}
                    <span className="font-semibold">{importState.result.errors.length}</span>
                  </div>
                  {importState.result.errors.length > 0 ? (
                    <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
                      {importState.result.errors.slice(0, 5).map((error) => (
                        <div key={`${error.index}-${error.email ?? "unknown"}`}>
                          Ligne {error.index >= 0 ? error.index + 1 : "?"}: {error.email ? `${error.email} — ` : ""}
                          {error.message}
                        </div>
                      ))}
                      {importState.result.errors.length > 5 ? (
                        <div className="mt-1 text-xs opacity-80">… {importState.result.errors.length - 5} autre(s) erreur(s)</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={importState.status === "loading"}>
                Retour
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose} disabled={importState.status === "loading"}>
                  Fermer
                </Button>
                <Button
                  type="button"
                  onClick={handleImport}
                  disabled={importState.status === "loading" || (skipInvalidRows ? validAgents.length === 0 : mappedRows.length === 0)}
                >
                  {importState.status === "loading" ? "Import en cours..." : "Lancer l'import"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
