"use client";

import { useMemo, useState } from "react";

import {
  deleteStudentAction,
  importStudentsFromCsvAction,
  saveStudentAction,
} from "@/app/actions/students";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { getStudentDisplayName, type StudentRecord } from "@/lib/utils/supabase/students-shared";

type StudentsManagementPanelProps = {
  initialStudents: StudentRecord[];
};

type StudentFormState = {
  id: string | null;
  nom: string;
  post_nom: string;
  prenom: string;
  grade: string;
  email: string;
};

const emptyStudentForm: StudentFormState = {
  id: null,
  nom: "",
  post_nom: "",
  prenom: "",
  grade: "",
  email: "",
};

const csvTemplate = `nom,post_nom,prenom,grade,email
Doe,Ngoyi,Jeanne,L1,jeanne.doe@exemple.com
Mbuyi,Tshilobo,Patrick,L2,patrick.mbuyi@exemple.com`;

const downloadCsvTemplate = () => {
  const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-etudiants.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const buildStudentForm = (student: StudentRecord | null): StudentFormState => {
  if (!student) {
    return emptyStudentForm;
  }

  return {
    id: student.id,
    nom: student.nom ?? "",
    post_nom: student.post_nom ?? "",
    prenom: student.prenom ?? "",
    grade: student.grade ?? "",
    email: student.email ?? "",
  };
};

export default function StudentsManagementPanel({ initialStudents }: StudentsManagementPanelProps) {
  const [students, setStudents] = useState(initialStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState<StudentFormState>(emptyStudentForm);
  const [csvContent, setCsvContent] = useState("");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  const availableGrades = useMemo(
    () =>
      Array.from(new Set(students.map((student) => student.grade?.trim()).filter(Boolean) as string[])).sort((left, right) =>
        left.localeCompare(right),
      ),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return students.filter((student) => {
      const matchesGrade = gradeFilter === "all" ? true : student.grade === gradeFilter;
      const haystack = [student.nom, student.post_nom, student.prenom, student.grade, student.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      return matchesGrade && matchesSearch;
    });
  }, [gradeFilter, searchTerm, students]);

  const selectedStudents = useMemo(
    () => students.filter((student) => selectedStudentIds.includes(student.id)),
    [selectedStudentIds, students],
  );

  const filteredStudentIds = filteredStudents.map((student) => student.id);
  const areAllFilteredStudentsSelected =
    filteredStudentIds.length > 0 && filteredStudentIds.every((studentId) => selectedStudentIds.includes(studentId));

  const openCreateModal = () => {
    setFeedback(null);
    setStudentForm(emptyStudentForm);
    setStudentModalOpen(true);
  };

  const openEditModal = (student: StudentRecord) => {
    setFeedback(null);
    setStudentForm(buildStudentForm(student));
    setStudentModalOpen(true);
  };

  const closeStudentModal = () => {
    if (isSaving) {
      return;
    }

    setStudentModalOpen(false);
    setStudentForm(emptyStudentForm);
  };

  const closeBulkModal = () => {
    if (isImporting) {
      return;
    }

    setBulkModalOpen(false);
    setCsvContent("");
    setCsvFileName(null);
  };

  const openBulkModal = () => {
    setFeedback(null);
    setCsvContent("");
    setCsvFileName(null);
    setBulkModalOpen(true);
  };

  const upsertStudentInState = (student: StudentRecord) => {
    setStudents((currentStudents) => {
      const existingIndex = currentStudents.findIndex((item) => item.id === student.id);

      if (existingIndex === -1) {
        return [student, ...currentStudents];
      }

      const nextStudents = [...currentStudents];
      nextStudents[existingIndex] = student;
      return nextStudents;
    });
  };

  const handleSaveStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const savedStudent = await saveStudentAction({
        id: studentForm.id,
        nom: studentForm.nom,
        post_nom: studentForm.post_nom,
        prenom: studentForm.prenom,
        grade: studentForm.grade,
        email: studentForm.email,
      });

      upsertStudentInState(savedStudent);
      setFeedback({
        type: "success",
        message: studentForm.id ? "Etudiant mis a jour." : "Etudiant cree avec succes.",
      });
      setStudentModalOpen(false);
      setStudentForm(emptyStudentForm);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "student_save_failed",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async (student: StudentRecord) => {
    const confirmed = window.confirm(`Supprimer ${getStudentDisplayName(student)} ?`);

    if (!confirmed) {
      return;
    }

    setFeedback(null);

    try {
      await deleteStudentAction(student.id);
      setStudents((currentStudents) => currentStudents.filter((item) => item.id !== student.id));
      setSelectedStudentIds((currentStudents) => currentStudents.filter((studentId) => studentId !== student.id));
      setFeedback({ type: "success", message: "Etudiant supprime." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "student_delete_failed",
      });
    }
  };

  const handleBulkImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!csvContent.trim()) {
      setFeedback({
        type: "error",
        message: "Selectionnez d'abord un fichier CSV.",
      });
      return;
    }

    setIsImporting(true);
    setFeedback(null);

    try {
      const result = await importStudentsFromCsvAction(csvContent);
      setStudents(result.students);
      setFeedback({
        type: "success",
        message: `${result.importedCount} etudiant(s) importe(s).`,
      });
      setBulkModalOpen(false);
      setCsvContent("");
      setCsvFileName(null);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "student_bulk_import_failed",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCsvFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setCsvContent("");
      setCsvFileName(null);
      return;
    }

    try {
      const content = await file.text();
      setCsvContent(content);
      setCsvFileName(file.name);
      setFeedback(null);
    } catch {
      setCsvContent("");
      setCsvFileName(null);
      setFeedback({
        type: "error",
        message: "Impossible de lire le fichier CSV selectionne.",
      });
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((currentIds) =>
      currentIds.includes(studentId) ? currentIds.filter((id) => id !== studentId) : [...currentIds, studentId],
    );
  };

  const toggleSelectAllFilteredStudents = () => {
    setSelectedStudentIds((currentIds) => {
      if (areAllFilteredStudentsSelected) {
        return currentIds.filter((studentId) => !filteredStudentIds.includes(studentId));
      }

      return Array.from(new Set([...currentIds, ...filteredStudentIds]));
    });
  };

  const exportSelectedStudents = () => {
    if (selectedStudents.length === 0) {
      setFeedback({
        type: "error",
        message: "Selectionnez au moins un etudiant a exporter.",
      });
      return;
    }

    const lines = [
      "nom,post_nom,prenom,grade,email",
      ...selectedStudents.map((student) =>
        [student.nom, student.post_nom, student.prenom, student.grade, student.email]
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "etudiants-selection.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setFeedback({
      type: "success",
      message: `${selectedStudents.length} etudiant(s) exporte(s).`,
    });
  };

  return (
    <div className="space-y-6">
      {feedback ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300"
              : "border border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <ComponentCard
        title="Liste des etudiants"
        desc="Le mail est obligatoire et est maintenant stocke directement dans la table students."
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Etudiants</p>
              <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{students.length}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={openBulkModal}>
                Import CSV
              </Button>
              <Button onClick={openCreateModal}>Nouvel etudiant</Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher un etudiant..."
                className="h-11 w-full max-w-md rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />

              <select
                value={gradeFilter}
                onChange={(event) => setGradeFilter(event.target.value)}
                className="h-11 min-w-[180px] rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">Tous les grades</option>
                {availableGrades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={exportSelectedStudents} disabled={selectedStudents.length === 0}>
                Exporter la selection
              </Button>
              <button type="button" onClick={downloadCsvTemplate} className="text-sm font-medium text-brand-500 hover:text-brand-600">
                Telecharger le template CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <input
                      type="checkbox"
                      checked={areAllFilteredStudentsSelected}
                      onChange={toggleSelectAllFilteredStudents}
                      className="h-4 w-4 rounded border border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700"
                    />
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Nom complet
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Grade
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Email
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Mapping
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="px-5 py-4 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => toggleStudentSelection(student.id)}
                        className="h-4 w-4 rounded border border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700"
                      />
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {getStudentDisplayName(student)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {student.grade || "Non renseigne"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {student.email || "Email non resolu"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                          student.user_id
                            ? "bg-success-50 text-success-700 ring-success-600/20 dark:bg-success-500/10 dark:text-success-300"
                            : "bg-warning-50 text-warning-700 ring-warning-600/20 dark:bg-warning-500/10 dark:text-warning-300"
                        }`}
                      >
                        {student.user_id ? "Lie a auth.users" : "Aucun user lie"}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          className="text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student)}
                          className="text-sm font-medium text-error-500 hover:text-error-600"
                        >
                          Supprimer
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <td colSpan={6} className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                      Aucun etudiant trouve.
                    </td>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </ComponentCard>

      <Modal isOpen={studentModalOpen} onClose={closeStudentModal} size="lg">
        <div className="space-y-6 p-1">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {studentForm.id ? "Modifier un etudiant" : "Nouvel etudiant"}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Le mail est enregistre directement sur l&apos;etudiant.
            </p>
          </div>

          <form onSubmit={handleSaveStudent} className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="student-nom">
                Nom
              </label>
              <input
                id="student-nom"
                required
                value={studentForm.nom}
                onChange={(event) => setStudentForm((current) => ({ ...current, nom: event.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="student-postnom">
                Post-nom
              </label>
              <input
                id="student-postnom"
                required
                value={studentForm.post_nom}
                onChange={(event) => setStudentForm((current) => ({ ...current, post_nom: event.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="student-prenom">
                Prenom
              </label>
              <input
                id="student-prenom"
                required
                value={studentForm.prenom}
                onChange={(event) => setStudentForm((current) => ({ ...current, prenom: event.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="student-grade">
                Grade
              </label>
              <input
                id="student-grade"
                required
                value={studentForm.grade}
                onChange={(event) => setStudentForm((current) => ({ ...current, grade: event.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="student-email">
                Email
              </label>
              <input
                id="student-email"
                type="email"
                required
                value={studentForm.email}
                onChange={(event) => setStudentForm((current) => ({ ...current, email: event.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="flex justify-end gap-3 lg:col-span-2">
              <Button type="button" variant="outline" onClick={closeStudentModal} disabled={isSaving}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Enregistrement..." : studentForm.id ? "Mettre a jour" : "Creer"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={bulkModalOpen} onClose={closeBulkModal} size="xl">
        <div className="space-y-6 p-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Import bulk CSV</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Colonnes attendues: `nom`, `post_nom`, `prenom`, `grade`, `email`.
              </p>
            </div>

            <Button type="button" variant="outline" onClick={downloadCsvTemplate}>
              Telecharger le template
            </Button>
          </div>

          <form onSubmit={handleBulkImport} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="students-csv-file">
                Fichier CSV
              </label>
              <input
                id="students-csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileChange}
                className="block w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs file:mr-4 file:rounded-md file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-600 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {csvFileName ? `Fichier charge: ${csvFileName}` : "Aucun fichier selectionne."}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="students-csv-preview">
                Apercu du contenu
              </label>
              <textarea
                id="students-csv-preview"
                rows={14}
                value={csvContent}
                readOnly
                placeholder="Le contenu du fichier CSV s'affichera ici apres selection."
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 font-mono text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeBulkModal} disabled={isImporting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isImporting || !csvContent.trim()}>
                {isImporting ? "Creation..." : "Creer"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
