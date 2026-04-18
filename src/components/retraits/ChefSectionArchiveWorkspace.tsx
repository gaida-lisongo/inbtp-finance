"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DataTable from "@/components/common/DataTable";
import { Modal } from "@/components/ui/modal";
import type { CsArchiveSnapshot } from "@/lib/utils/supabase/cs-archive";

type Props = {
  anneeId: string;
  programmeId: string;
  snapshot: CsArchiveSnapshot;
};

type ParsedBulkRow = {
  id: string;
  mail: string;
  notes: Array<{ matiere_id: string; rattrapage: number }>;
  invalidCount: number;
};

type BulkReport = {
  totalRows: number;
  parsedRows: number;
  skippedMissingEmail: number;
  invalidValues: number;
  matchedStudents: number;
  upserts: number;
  skippedUnknownStudents: number;
  skippedUnknownMatieres: number;
};

const detectCsvDelimiter = (row: string): ";" | "," | "\t" => {
  const tabs = row.split("\t").length - 1;
  const semicolons = row.split(";").length - 1;
  const commas = row.split(",").length - 1;
  if (tabs >= semicolons && tabs >= commas) return "\t";
  return semicolons >= commas ? ";" : ",";
};

const splitCsvRow = (row: string, delimiter: ";" | "," | "\t") => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];
    const next = row[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === delimiter) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((item) => item.trim());
};

const parseNumberOrNull = (value: string) => {
  if (!value || value.trim().length === 0) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
};

const buildStudentName = (student: {
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  email: string | null;
}) => [student.prenom, student.post_nom, student.nom].filter(Boolean).join(" ").trim() || student.email || "Etudiant";

const chunkRows = <T,>(rows: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ChefSectionArchiveWorkspace({ anneeId, programmeId, snapshot }: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"overview" | "import">("overview");
  const [selectedMatiereId, setSelectedMatiereId] = useState<string>("all");
  const [csvContent, setCsvContent] = useState("");
  const [csvFilename, setCsvFilename] = useState("");
  const [emailColumn, setEmailColumn] = useState<number>(1);
  const [selectedMatiereIds, setSelectedMatiereIds] = useState<string[]>([]);
  const [matiereColumnMap, setMatiereColumnMap] = useState<Record<string, number>>({});
  const [parsedRows, setParsedRows] = useState<ParsedBulkRow[]>([]);
  const [report, setReport] = useState<BulkReport | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [finalModalOpen, setFinalModalOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const lectureRows = useMemo(
    () =>
      snapshot.students.map((row) => {
        const finalValues = Object.values(row.notesByMatiereId)
          .map((item) => {
            const session = (item.cc ?? 0) + (item.examen ?? 0);
            const final = item.rachat ?? (item.rattrapage ?? session);
            return Number.isFinite(final) ? Number(final) : null;
          })
          .filter((item): item is number => typeof item === "number");
        const studentPercentage =
          finalValues.length > 0
            ? Math.round(((finalValues.reduce((sum, item) => sum + item, 0) / (finalValues.length * 20)) * 100) * 100) / 100
            : null;

        const selectedNote =
          selectedMatiereId !== "all" ? row.notesByMatiereId[selectedMatiereId]?.rattrapage ?? null : null;

        return {
          id: row.student.id,
          studentName: buildStudentName(row.student),
          email: row.student.email ?? "",
          reference: row.reference ?? "",
          notesCount: finalValues.length,
          studentPercentage,
          selectedNote,
        };
      }),
    [selectedMatiereId, snapshot.students],
  );

  const metrics = useMemo(() => {
    const uniqueSemestres = new Set(
      snapshot.matieres.map((item) => item.semestre?.id).filter((value): value is string => Boolean(value)),
    );
    const uniqueUnites = new Set(
      snapshot.matieres.map((item) => item.unite?.id).filter((value): value is string => Boolean(value)),
    );
    const noteValues = snapshot.students.flatMap((student) =>
      Object.values(student.notesByMatiereId)
        .map((item) => item.rattrapage)
        .filter((value): value is number => typeof value === "number"),
    );

    const studentsWithNotes = snapshot.students.filter((student) =>
      Object.values(student.notesByMatiereId).some((item) => typeof item.rattrapage === "number"),
    ).length;

    return {
      totalStudents: snapshot.students.length,
      totalSemestres: uniqueSemestres.size,
      totalUnites: uniqueUnites.size,
      totalMatieres: snapshot.matieres.length,
      studentsWithNotes,
      avgRattrapage:
        noteValues.length > 0
          ? Math.round((noteValues.reduce((sum, item) => sum + item, 0) / noteValues.length) * 100) / 100
          : null,
    };
  }, [snapshot.matieres, snapshot.students]);

  const tableColumns = useMemo(
    () => [
      { key: "studentName", label: "Etudiant" },
      { key: "email", label: "Email" },
      { key: "reference", label: "Reference" },
      {
        key: "notesCount",
        label: "Matieres cotees",
        render: (item: (typeof lectureRows)[number]) => item.notesCount,
      },
      {
        key: "studentPercentage",
        label: "Pourcentage",
        render: (item: (typeof lectureRows)[number]) =>
          item.studentPercentage === null ? "—" : `${item.studentPercentage.toFixed(2)}%`,
      },
      {
        key: "selectedNote",
        label: selectedMatiereId === "all" ? "Note filtree" : "Rattrapage matiere",
        render: (item: (typeof lectureRows)[number]) =>
          item.selectedNote === null ? "—" : `${item.selectedNote.toFixed(2)} / 20`,
      },
    ],
    [selectedMatiereId],
  );

  const parseBulkRows = () => {
    setLocalError(null);
    if (!csvContent.trim()) {
      setLocalError("Selectionnez d'abord un fichier CSV.");
      return;
    }
    if (selectedMatiereIds.length === 0) {
      setLocalError("Selectionnez au moins une matiere.");
      return;
    }

    const normalized = csvContent.replace(/\r/g, "").trim();
    const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      setLocalError("Le CSV ne contient pas de lignes exploitables.");
      return;
    }

    const delimiter = detectCsvDelimiter(lines[0]);
    // Accepte les CSV avec ou sans en-tete.
    const firstCells = splitCsvRow(lines[0], delimiter);
    const firstEmail = (firstCells[emailColumn - 1] ?? "").trim();
    const looksLikeHeader = !firstEmail.includes("@");
    const contentLines = looksLikeHeader ? lines.slice(1) : lines;
    let skippedMissingEmail = 0;
    let invalidValues = 0;
    const parsed: ParsedBulkRow[] = [];

    contentLines.forEach((line, index) => {
      const cells = splitCsvRow(line, delimiter);
      const email = (cells[emailColumn - 1] ?? "").trim().toLowerCase();
      if (!email) {
        skippedMissingEmail += 1;
        return;
      }

      const notes: ParsedBulkRow["notes"] = [];
      let rowInvalidCount = 0;

      for (const matiereId of selectedMatiereIds) {
        const col = matiereColumnMap[matiereId];
        if (!col || col <= 0) continue;
        const value = parseNumberOrNull(cells[col - 1] ?? "");
        if (value === null || value < 0 || value > 20) {
          rowInvalidCount += 1;
          invalidValues += 1;
          continue;
        }
        notes.push({ matiere_id: matiereId, rattrapage: value });
      }

      if (notes.length === 0) return;
      parsed.push({ id: `parsed-${index}`, mail: email, notes, invalidCount: rowInvalidCount });
    });

    setParsedRows(parsed);
    setReport({
      totalRows: contentLines.length,
      parsedRows: parsed.length,
      skippedMissingEmail,
      invalidValues,
      matchedStudents: 0,
      upserts: 0,
      skippedUnknownStudents: 0,
      skippedUnknownMatieres: 0,
    });
    setStep(2);
  };

  const startBackgroundUpload = async () => {
    if (parsedRows.length === 0) {
      setLocalError("Aucune ligne valide a envoyer.");
      return;
    }

    try {
      setStep(3);
      setIsProcessing(true);
      setProgress(0);
      setProgressLabel("Demarrage...");

      const chunks = chunkRows(parsedRows, 40);
      const aggregate = {
        matchedStudents: 0,
        upserts: 0,
        skippedUnknownStudents: 0,
        skippedUnknownMatieres: 0,
      };

      for (let index = 0; index < chunks.length; index += 1) {
        setProgressLabel(`Traitement du lot ${index + 1}/${chunks.length}`);
        const chunkPayload = {
          anneeId,
          rows: chunks[index].map((item) => ({ mail: item.mail, notes: item.notes })),
        };

        const maxAttempts = 3;
        type BulkResponse = {
          error?: string;
          matchedStudents?: number;
          upserts?: number;
          skippedUnknownStudents?: number;
          skippedUnknownMatieres?: number;
        };
        let payload: BulkResponse | null = null;
        let success = false;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          const response = await fetch(`/api/cs/programmes/${programmeId}/cotation/bulk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(chunkPayload),
          });

          const contentType = response.headers.get("content-type") ?? "";
          let errorCode = "bulk_import_failed";

          if (contentType.includes("application/json")) {
            payload = (await response.json()) as BulkResponse;
            errorCode = payload?.error || errorCode;
          } else {
            const text = await response.text();
            if (text.includes("502") || text.toLowerCase().includes("bad gateway")) {
              errorCode = "upstream_bad_gateway";
            }
          }

          if (response.ok) {
            success = true;
            break;
          }

          const retryable =
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504 ||
            errorCode === "upstream_bad_gateway";

          if (!retryable || attempt === maxAttempts) {
            throw new Error(errorCode);
          }

          await sleep(attempt * 1200);
        }

        if (!success) {
          throw new Error("bulk_import_failed");
        }

        aggregate.matchedStudents += payload?.matchedStudents ?? 0;
        aggregate.upserts += payload?.upserts ?? 0;
        aggregate.skippedUnknownStudents += payload?.skippedUnknownStudents ?? 0;
        aggregate.skippedUnknownMatieres += payload?.skippedUnknownMatieres ?? 0;
        setProgress(Math.round(((index + 1) / chunks.length) * 100));
      }

      setReport((current) =>
        current
          ? {
              ...current,
              matchedStudents: aggregate.matchedStudents,
              upserts: aggregate.upserts,
              skippedUnknownStudents: aggregate.skippedUnknownStudents,
              skippedUnknownMatieres: aggregate.skippedUnknownMatieres,
            }
          : current,
      );
      setProgressLabel("Termine");
      setFinalModalOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "bulk_import_failed";
      setLocalError(
        message === "upstream_bad_gateway"
          ? "Le serveur de donnees est temporairement indisponible (502). Reessayez dans quelques instants."
          : `Import interrompu: ${message}`,
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const onCsvFileChange = async (file: File | null) => {
    if (!file) {
      setCsvContent("");
      setCsvFilename("");
      return;
    }
    try {
      const text = await file.text();
      setCsvContent(text);
      setCsvFilename(file.name);
    } catch {
      setLocalError("Impossible de lire le CSV.");
    }
  };

  if (viewMode === "import") {
    return (
      <section className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Archivage des resultats</p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">Import bulk CSV</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setViewMode("overview");
              setStep(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 dark:border-gray-700 dark:text-gray-200"
          >
            Retour a /cs
          </button>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3].map((item) => (
              <span
                key={item}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  step === item ? "bg-brand-500 text-white" : "border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                }`}
              >
                Etape {item}
              </span>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Fichier CSV</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => onCsvFileChange(event.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{csvFilename || "Aucun fichier selectionne"}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Colonne email (1-based)</label>
              <input
                type="number"
                min={1}
                value={emailColumn}
                onChange={(event) => setEmailColumn(Number(event.target.value || 1))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {snapshot.matieres.map((matiere) => {
              const checked = selectedMatiereIds.includes(matiere.id);
              return (
                <label key={matiere.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800">
                  <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedMatiereIds((current) =>
                          current.includes(matiere.id) ? current.filter((item) => item !== matiere.id) : [...current, matiere.id],
                        )
                      }
                    />
                    <span>{matiere.designation || "Matiere"}</span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    disabled={!checked}
                    value={matiereColumnMap[matiere.id] ?? ""}
                    onChange={(event) =>
                      setMatiereColumnMap((current) => ({ ...current, [matiere.id]: Number(event.target.value || 0) }))
                    }
                    placeholder="Col."
                    className="w-20 rounded-lg border border-gray-300 bg-transparent px-2 py-1 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
                  />
                </label>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={parseBulkRows} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600">
              Charger en memoire
            </button>
            <button
              type="button"
              onClick={startBackgroundUpload}
              disabled={isProcessing || parsedRows.length === 0}
              className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 disabled:opacity-60 dark:hover:bg-brand-500/10"
            >
              Lancer l&apos;import en tache de fond
            </button>
          </div>

          {report ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900">Lignes CSV: {report.totalRows}</div>
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900">Lignes valides: {report.parsedRows}</div>
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900">Emails manquants: {report.skippedMissingEmail}</div>
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900">Valeurs invalides: {report.invalidValues}</div>
            </div>
          ) : null}
        </div>

        {localError ? (
          <div className="rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
            {localError}
          </div>
        ) : null}

        {isProcessing ? (
          <div className="fixed bottom-4 left-4 z-50 w-[340px] rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Import des resultats en cours</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{progressLabel}</p>
            <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
              <div className="h-2 rounded-full bg-brand-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{progress}%</p>
          </div>
        ) : null}

        <Modal isOpen={finalModalOpen} onClose={() => setFinalModalOpen(false)} size="md">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rapport final d&apos;import</h3>
            {report ? (
              <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p>Etudiants reconnus: {report.matchedStudents}</p>
                <p>Insertions/Mises a jour fiche_cotation: {report.upserts}</p>
                <p>Etudiants non trouves: {report.skippedUnknownStudents}</p>
                <p>Matieres ignorees: {report.skippedUnknownMatieres}</p>
                <p>Valeurs invalides: {report.invalidValues}</p>
              </div>
            ) : null}
          </div>
        </Modal>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Etudiants inscrits</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{metrics.totalStudents}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Semestres</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{metrics.totalSemestres}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Unites</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{metrics.totalUnites}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Matieres</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{metrics.totalMatieres}</div>
        </div>
      </div>
      <DataTable
        data={lectureRows}
        columns={tableColumns}
        searchPlaceholder="Rechercher un etudiant..."
        preSearchActions={
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 dark:border-gray-700 dark:text-gray-200"
          >
            Actualiser
          </button>
        }
        headerActions={
          <>
            <select
              value={selectedMatiereId}
              onChange={(event) => setSelectedMatiereId(event.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">Toutes les matieres</option>
              {snapshot.matieres.map((matiere) => (
                <option key={matiere.id} value={matiere.id}>
                  {matiere.designation || "Matiere"} {matiere.unite?.code ? `(${matiere.unite.code})` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setViewMode("import")}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Importer les resultats
            </button>
          </>
        }
      />
    </section>
  );
}
