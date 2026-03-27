"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  bulkCreateParcoursAction,
  deleteParcoursByIdAction,
  deleteSessionByIdAction,
  saveParcoursModalAction,
  saveSessionModalAction,
} from "@/app/(admin)/(gestionnaire)/app/actions";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { ParcoursRecord, ParcoursWithStudent, SessionRecord } from "@/lib/utils/supabase/appariteur";
import { getStudentDisplayName, type StudentRecord } from "@/lib/utils/supabase/students-shared";

type AppManagementPanelProps = {
  anneeId: string;
  programmeId: string;
  sessions: SessionRecord[];
  parcours: ParcoursWithStudent[];
  students: StudentRecord[];
  editingSession: SessionRecord | null;
  editingParcours: ParcoursRecord | null;
  mode?: string;
  status?: string;
  message?: string;
};

type ActiveTab = "sessions" | "parcours";

type SessionFormState = {
  id: string | null;
  designation: string;
  description: string;
  date_debut: string;
  date_fin: string;
  matieres: SessionMatiereFormState[];
  montant: string;
  is_active: string;
  entra_id: string;
};

type SessionMatiereFormState = {
  matiere: string;
  date_epreuve: string;
};

type ParcoursFormState = {
  id: string | null;
  student_id: string;
  reference: string;
  status: "ok" | "pending" | "no";
};

const emptySessionForm: SessionFormState = {
  id: null,
  designation: "",
  description: "",
  date_debut: "",
  date_fin: "",
  matieres: [{ matiere: "", date_epreuve: "" }],
  montant: "",
  is_active: "false",
  entra_id: "",
};

const emptyParcoursForm: ParcoursFormState = {
  id: null,
  student_id: "",
  reference: "",
  status: "pending",
};

const bulkParcoursTemplate = `email,reference,status
jeanne.doe@exemple.com,PARC-001,pending
patrick.mbuyi@exemple.com,PARC-002,ok`;

const formatDate = (value: string | null) => {
  if (!value) {
    return "Non renseignee";
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
};

const formatJsonField = (value: unknown) => {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getGeneratedSessionSlug = (form: Pick<SessionFormState, "designation" | "date_debut" | "date_fin">) => {
  const parts = [form.designation.trim(), form.date_debut.trim(), form.date_fin.trim()].filter(Boolean);
  return slugify(parts.join("-"));
};

const parseSessionDescription = (value: unknown) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && "text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>).text ?? "");
  }

  return formatJsonField(value);
};

const parseSessionMatieres = (value: unknown): SessionMatiereFormState[] => {
  if (!Array.isArray(value)) {
    return emptySessionForm.matieres;
  }

  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      return {
        matiere: typeof record.matiere === "string" ? record.matiere : "",
        date_epreuve:
          typeof record.date_epreuve === "string"
            ? record.date_epreuve
            : typeof record.date === "string"
              ? record.date
              : "",
      };
    })
    .filter(Boolean) as SessionMatiereFormState[];

  return items.length > 0 ? items : emptySessionForm.matieres;
};

const getMessage = (message?: string) => {
  if (!message) {
    return null;
  }

  switch (message) {
    case "access_denied":
      return "Acces refuse a la gestion des inscriptions.";
    case "student_required":
      return "Selectionnez un etudiant avant d'enregistrer le parcours.";
    case "programme_required":
      return "La promotion cible est obligatoire.";
    case "session_designation_required":
      return "La designation de la session est obligatoire.";
    case "session_date_debut_required":
      return "La date de debut est obligatoire.";
    case "session_date_fin_required":
      return "La date de fin est obligatoire.";
    case "session_invalid_period":
      return "La date de fin doit etre posterieure ou egale a la date de debut.";
    case "session_invalid_montant":
      return "Le montant doit etre un nombre positif ou nul.";
    case "session_matieres_required":
      return "Ajoutez au moins une matiere avec sa date d'epreuve.";
    case "invalid_session_status":
      return "Le statut de la session doit etre true ou false.";
    case "session_notification_no_student_email":
      return "Session creee, mais aucun email etudiant exploitable n'a ete trouve.";
    case "session_not_found":
      return "Session creee, mais la relance de notification n'a pas retrouve la session.";
    case "session_notification_failed":
      return "Session creee, mais la notification a echoue.";
    case "graph_mail_sender_not_configured":
      return "Session creee, mais l'adresse emettrice Microsoft 365 n'est pas configuree.";
    case "invalid_parcours_status":
      return "Le statut doit etre ok, pending ou no.";
    case "csv_invalid_header":
      return "Le fichier CSV doit contenir les colonnes email, reference, status.";
    default:
      if (message.startsWith("session_matiere_required_")) {
        const line = message.replace("session_matiere_required_", "");
        return `La matiere de la ligne ${line} est obligatoire.`;
      }

      if (message.startsWith("session_matiere_date_required_")) {
        const line = message.replace("session_matiere_date_required_", "");
        return `La date d'epreuve de la ligne ${line} est obligatoire.`;
      }

      if (message.startsWith("email_not_found_line_")) {
        const line = message.replace("email_not_found_line_", "");
        return `Aucun etudiant trouve pour l'email de la ligne ${line}.`;
      }

      return message;
  }
};

const buildSessionForm = (session: SessionRecord | null): SessionFormState => {
  if (!session) {
    return emptySessionForm;
  }

  return {
    id: session.id,
    designation: session.designation ?? "",
    description: parseSessionDescription(session.description),
    date_debut: session.date_debut ?? "",
    date_fin: session.date_fin ?? "",
    matieres: parseSessionMatieres(session.matieres),
    montant: session.montant != null ? String(session.montant) : "",
    is_active: session.is_active ?? "false",
    entra_id: session.entra_id ?? "",
  };
};

const buildParcoursForm = (parcours: ParcoursRecord | null): ParcoursFormState => ({
  id: parcours?.id ?? null,
  student_id: parcours?.student_id ?? "",
  reference: parcours?.reference ?? "",
  status: (parcours?.status as "ok" | "pending" | "no") ?? "pending",
});

const downloadBulkTemplate = () => {
  const blob = new Blob([bulkParcoursTemplate], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-inscriptions-parcours.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function AppManagementPanel({
  anneeId,
  programmeId,
  sessions,
  parcours,
  students,
  editingSession,
  editingParcours,
  mode,
  status,
  message,
}: AppManagementPanelProps) {
  const initialFeedback =
    (status === "success" || status === "error") && getMessage(message)
      ? { type: status, message: getMessage(message)! }
      : null;
  const [activeTab, setActiveTab] = useState<ActiveTab>(editingParcours || mode === "parcours-create" ? "parcours" : "sessions");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(initialFeedback);
  const [sessionsState, setSessionsState] = useState(sessions);
  const [parcoursState, setParcoursState] = useState(parcours);
  const [sessionModalOpen, setSessionModalOpen] = useState(Boolean(editingSession) || mode === "session-create");
  const [parcoursModalOpen, setParcoursModalOpen] = useState(Boolean(editingParcours) || mode === "parcours-create");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [sessionStep, setSessionStep] = useState<1 | 2>(1);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [isSavingParcours, setIsSavingParcours] = useState(false);
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionFormState>(buildSessionForm(editingSession));
  const [parcoursForm, setParcoursForm] = useState<ParcoursFormState>(buildParcoursForm(editingParcours));
  const [bulkCsvContent, setBulkCsvContent] = useState("");
  const [bulkCsvFileName, setBulkCsvFileName] = useState<string | null>(null);

  useEffect(() => {
    if (editingSession) {
      setSessionForm(buildSessionForm(editingSession));
      setSessionModalOpen(true);
      setSessionStep(1);
      setActiveTab("sessions");
    }
  }, [editingSession]);

  useEffect(() => {
    if (editingParcours) {
      setParcoursForm(buildParcoursForm(editingParcours));
      setParcoursModalOpen(true);
      setActiveTab("parcours");
    }
  }, [editingParcours]);

  const activeSessionsCount = useMemo(
    () => sessionsState.filter((session) => session.is_active?.toLowerCase() === "true" || session.is_active?.toLowerCase() === "actif").length,
    [sessionsState],
  );

  const studentOptions = useMemo(
    () =>
      students
        .slice()
        .sort((left, right) => getStudentDisplayName(left).localeCompare(getStudentDisplayName(right)))
        .map((student) => ({
          id: student.id,
          label: `${getStudentDisplayName(student)}${student.email ? ` - ${student.email}` : ""}`,
        })),
    [students],
  );

  const generatedSessionSlug = useMemo(
    () => getGeneratedSessionSlug(sessionForm),
    [sessionForm.date_debut, sessionForm.date_fin, sessionForm.designation],
  );

  const closeSessionModal = () => {
    if (isSavingSession) {
      return;
    }

    setSessionModalOpen(false);
    setSessionForm(emptySessionForm);
    setSessionStep(1);
  };

  const closeParcoursModal = () => {
    if (isSavingParcours) {
      return;
    }

    setParcoursModalOpen(false);
    setParcoursForm(emptyParcoursForm);
  };

  const closeBulkModal = () => {
    if (isBulkCreating) {
      return;
    }

    setBulkModalOpen(false);
    setBulkCsvContent("");
    setBulkCsvFileName(null);
  };

  const handleOpenSessionCreate = () => {
    setFeedback(null);
    setSessionForm(emptySessionForm);
    setSessionModalOpen(true);
    setSessionStep(1);
    setActiveTab("sessions");
  };

  const handleOpenSessionEdit = (session: SessionRecord) => {
    setFeedback(null);
    setSessionForm(buildSessionForm(session));
    setSessionModalOpen(true);
    setSessionStep(1);
    setActiveTab("sessions");
  };

  const updateSessionMatiere = (index: number, field: keyof SessionMatiereFormState, value: string) => {
    setSessionForm((current) => ({
      ...current,
      matieres: current.matieres.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addSessionMatiere = () => {
    setSessionForm((current) => ({
      ...current,
      matieres: [...current.matieres, { matiere: "", date_epreuve: "" }],
    }));
  };

  const removeSessionMatiere = (index: number) => {
    setSessionForm((current) => ({
      ...current,
      matieres: current.matieres.length === 1 ? current.matieres : current.matieres.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const goToSessionStepTwo = () => {
    if (!sessionForm.designation.trim()) {
      setFeedback({ type: "error", message: getMessage("session_designation_required") ?? "session_designation_required" });
      return;
    }

    if (!sessionForm.date_debut.trim()) {
      setFeedback({ type: "error", message: getMessage("session_date_debut_required") ?? "session_date_debut_required" });
      return;
    }

    if (!sessionForm.date_fin.trim()) {
      setFeedback({ type: "error", message: getMessage("session_date_fin_required") ?? "session_date_fin_required" });
      return;
    }

    if (sessionForm.date_fin < sessionForm.date_debut) {
      setFeedback({ type: "error", message: getMessage("session_invalid_period") ?? "session_invalid_period" });
      return;
    }

    setFeedback(null);
    setSessionStep(2);
  };

  const handleOpenParcoursCreate = () => {
    setFeedback(null);
    setParcoursForm(emptyParcoursForm);
    setParcoursModalOpen(true);
    setActiveTab("parcours");
  };

  const handleOpenParcoursEdit = (item: ParcoursWithStudent) => {
    setFeedback(null);
    setParcoursForm(buildParcoursForm(item));
    setParcoursModalOpen(true);
    setActiveTab("parcours");
  };

  const handleSaveSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingSession(true);
    setFeedback(null);

    try {
      const result = await saveSessionModalAction({
        id: sessionForm.id,
        designation: sessionForm.designation,
        description: sessionForm.description,
        date_debut: sessionForm.date_debut,
        date_fin: sessionForm.date_fin,
        programme_id: programmeId,
        matieres: sessionForm.matieres,
        montant: sessionForm.montant.trim().length > 0 ? Number(sessionForm.montant) : null,
        is_active: sessionForm.is_active,
        entra_id: sessionForm.entra_id,
      });
      const savedSession = result.session;

      setSessionsState((current) => {
        const existingIndex = current.findIndex((item) => item.id === savedSession.id);

        if (existingIndex === -1) {
          return [savedSession, ...current];
        }

        const next = [...current];
        next[existingIndex] = savedSession;
        return next;
      });

      setSessionModalOpen(false);
      setSessionForm(emptySessionForm);
      setSessionStep(1);

      if (sessionForm.id) {
        setFeedback({
          type: "success",
          message: "Session mise a jour.",
        });
      } else if (result.notification) {
        setFeedback({
          type: "success",
          message: `Session creee. ${result.notification.notifiedCount} etudiant(s) notifie(s). ${result.notification.skippedCount > 0 ? `${result.notification.skippedCount} sans email.` : ""}`.trim(),
        });
      } else if (result.notificationError) {
        setFeedback({
          type: "success",
          message: `Session creee. Notification non envoyee: ${getMessage(result.notificationError) ?? result.notificationError}`,
        });
      } else {
        setFeedback({
          type: "success",
          message: "Session creee.",
        });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: getMessage(error instanceof Error ? error.message : "session_save_failed") ?? "session_save_failed",
      });
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleDeleteSession = async (session: SessionRecord) => {
    if (!window.confirm(`Supprimer la session ${session.designation || session.id} ?`)) {
      return;
    }

    try {
      await deleteSessionByIdAction(session.id);
      setSessionsState((current) => current.filter((item) => item.id !== session.id));
      setFeedback({ type: "success", message: "Session supprimee." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getMessage(error instanceof Error ? error.message : "session_delete_failed") ?? "session_delete_failed",
      });
    }
  };

  const handleSaveParcours = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingParcours(true);
    setFeedback(null);

    try {
      const savedParcours = await saveParcoursModalAction({
        id: parcoursForm.id,
        student_id: parcoursForm.student_id,
        reference: parcoursForm.reference,
        status: parcoursForm.status,
        programme_id: programmeId,
      });

      setParcoursState((current) => {
        const existingIndex = current.findIndex((item) => item.id === savedParcours.id);

        if (existingIndex === -1) {
          return [savedParcours, ...current];
        }

        const next = [...current];
        next[existingIndex] = savedParcours;
        return next;
      });

      setParcoursModalOpen(false);
      setParcoursForm(emptyParcoursForm);
      setFeedback({
        type: "success",
        message: parcoursForm.id ? "Parcours mis a jour." : "Parcours cree.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getMessage(error instanceof Error ? error.message : "parcours_save_failed") ?? "parcours_save_failed",
      });
    } finally {
      setIsSavingParcours(false);
    }
  };

  const handleDeleteParcours = async (item: ParcoursWithStudent) => {
    if (!window.confirm(`Supprimer le parcours de ${item.student ? getStudentDisplayName(item.student) : item.id} ?`)) {
      return;
    }

    try {
      await deleteParcoursByIdAction(item.id);
      setParcoursState((current) => current.filter((entry) => entry.id !== item.id));
      setFeedback({ type: "success", message: "Parcours supprime." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getMessage(error instanceof Error ? error.message : "parcours_delete_failed") ?? "parcours_delete_failed",
      });
    }
  };

  const handleBulkFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setBulkCsvContent("");
      setBulkCsvFileName(null);
      return;
    }

    try {
      const content = await file.text();
      setBulkCsvContent(content);
      setBulkCsvFileName(file.name);
      setFeedback(null);
    } catch {
      setBulkCsvContent("");
      setBulkCsvFileName(null);
      setFeedback({ type: "error", message: "Impossible de lire le fichier CSV selectionne." });
    }
  };

  const handleBulkCreateParcours = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!bulkCsvContent.trim()) {
      setFeedback({ type: "error", message: "Selectionnez d'abord un fichier CSV." });
      return;
    }

    setIsBulkCreating(true);
    setFeedback(null);

    try {
      const parcoursList = await bulkCreateParcoursAction(programmeId, bulkCsvContent);
      setParcoursState(parcoursList);
      setBulkModalOpen(false);
      setBulkCsvContent("");
      setBulkCsvFileName(null);
      setFeedback({ type: "success", message: "Inscriptions bulk creees avec succes." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getMessage(error instanceof Error ? error.message : "parcours_bulk_create_failed") ?? "parcours_bulk_create_failed",
      });
    } finally {
      setIsBulkCreating(false);
    }
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-gray-50 px-4 py-4 dark:bg-white/[0.03]">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Sessions</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{sessionsState.length}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 px-4 py-4 dark:bg-white/[0.03]">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Sessions actives</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{activeSessionsCount}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 px-4 py-4 dark:bg-white/[0.03]">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Parcours</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{parcoursState.length}</p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setActiveTab("sessions")}
          className={`w-full rounded-md px-3 py-2 text-theme-sm font-medium ${
            activeTab === "sessions" ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          Sessions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("parcours")}
          className={`w-full rounded-md px-3 py-2 text-theme-sm font-medium ${
            activeTab === "parcours" ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          Parcours
        </button>
      </div>

      {activeTab === "sessions" ? (
        <ComponentCard title="Sessions de la promotion" desc="Gestion des sessions d'inscription et de leur perimetre.">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Creez et modifiez les sessions dans une modal sans quitter la page.
              </p>
              <Button onClick={handleOpenSessionCreate}>Nouvelle session</Button>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Designation
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Periode
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Montant
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Etat
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Slug
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {sessionsState.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                        {session.designation || "Sans designation"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(session.date_debut)} - {formatDate(session.date_fin)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {session.montant != null ? session.montant : "Non renseigne"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {session.is_active || "Non renseigne"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {session.slug || "Non defini"}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex justify-end gap-3">
                          <button type="button" onClick={() => handleOpenSessionEdit(session)} className="text-sm font-medium text-brand-500 hover:text-brand-600">
                            Modifier
                          </button>
                          <button type="button" onClick={() => handleDeleteSession(session)} className="text-sm font-medium text-error-500 hover:text-error-600">
                            Supprimer
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sessionsState.length === 0 ? (
                    <TableRow>
                      <td colSpan={6} className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                        Aucune session enregistree pour cette promotion.
                      </td>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>
        </ComponentCard>
      ) : (
        <ComponentCard title="Parcours des etudiants" desc="Gestion unitaire et creation bulk des inscriptions au parcours.">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Le bulk CSV attend exactement `email`, `reference` et `status` avec les valeurs `ok`, `pending` ou `no`.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setBulkModalOpen(true)}>
                  Bulk inscriptions
                </Button>
                <Button onClick={handleOpenParcoursCreate}>Nouvel enrollement</Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Etudiant
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Reference
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Statut
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Cree le
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {parcoursState.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                        {item.student ? getStudentDisplayName(item.student) : "Etudiant introuvable"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {item.reference || "Non renseignee"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {item.status || "Non renseigne"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(item.created_at)}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex justify-end gap-3">
                          <button type="button" onClick={() => handleOpenParcoursEdit(item)} className="text-sm font-medium text-brand-500 hover:text-brand-600">
                            Modifier
                          </button>
                          <button type="button" onClick={() => handleDeleteParcours(item)} className="text-sm font-medium text-error-500 hover:text-error-600">
                            Supprimer
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {parcoursState.length === 0 ? (
                    <TableRow>
                      <td colSpan={5} className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                        Aucun parcours enregistre pour cette promotion.
                      </td>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>
        </ComponentCard>
      )}

      <Modal isOpen={sessionModalOpen} onClose={closeSessionModal} size="xl">
        <div className="space-y-6 p-1">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {sessionForm.id ? "Modifier une session" : "Nouvelle session"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSessionStep(1)}
                className={`rounded-2xl border px-4 py-3 text-left ${
                  sessionStep === 1
                    ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
                    : "border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400"
                }`}
              >
                <p className="text-xs uppercase tracking-wide">Etape 1</p>
                <p className="mt-1 text-sm font-semibold">Description de la session</p>
              </button>
              <button
                type="button"
                onClick={() => setSessionStep(2)}
                className={`rounded-2xl border px-4 py-3 text-left ${
                  sessionStep === 2
                    ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
                    : "border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400"
                }`}
              >
                <p className="text-xs uppercase tracking-wide">Etape 2</p>
                <p className="mt-1 text-sm font-semibold">Matieres et dates d'epreuve</p>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveSession} className="space-y-6">
            {sessionStep === 1 ? (
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Designation</label>
                  <input
                    value={sessionForm.designation}
                    onChange={(event) => setSessionForm((current) => ({ ...current, designation: event.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Slug genere</label>
                  <input
                    value={generatedSessionSlug}
                    readOnly
                    className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Date debut</label>
                  <input
                    type="date"
                    value={sessionForm.date_debut}
                    onChange={(event) => setSessionForm((current) => ({ ...current, date_debut: event.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Date fin</label>
                  <input
                    type="date"
                    value={sessionForm.date_fin}
                    onChange={(event) => setSessionForm((current) => ({ ...current, date_fin: event.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Montant</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sessionForm.montant}
                    onChange={(event) => setSessionForm((current) => ({ ...current, montant: event.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Statut</label>
                  <select
                    value={sessionForm.is_active}
                    onChange={(event) => setSessionForm((current) => ({ ...current, is_active: event.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Par defaut la session reste inactive tant que vous ne la basculez pas sur `true`.</p>
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Description</label>
                  <textarea
                    rows={5}
                    value={sessionForm.description}
                    onChange={(event) => setSessionForm((current) => ({ ...current, description: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">Matieres de la session</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Precisez chaque matiere et la date de l'epreuve qui sera envoyee aux etudiants.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={addSessionMatiere}>
                    Ajouter une matiere
                  </Button>
                </div>

                <div className="space-y-4">
                  {sessionForm.matieres.map((matiere, index) => (
                    <div key={`${index}-${matiere.matiere}`} className="grid gap-4 rounded-2xl border border-gray-200 p-4 dark:border-gray-800 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                          Matiere {index + 1}
                        </label>
                        <input
                          value={matiere.matiere}
                          onChange={(event) => updateSessionMatiere(index, "matiere", event.target.value)}
                          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Date epreuve</label>
                        <input
                          type="date"
                          value={matiere.date_epreuve}
                          onChange={(event) => updateSessionMatiere(index, "date_epreuve", event.target.value)}
                          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                      </div>

                      <div className="flex items-end">
                        <Button type="button" variant="outline" onClick={() => removeSessionMatiere(index)} disabled={sessionForm.matieres.length === 1}>
                          Retirer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeSessionModal} disabled={isSavingSession}>
                Annuler
              </Button>

              {sessionStep === 2 ? (
                <>
                  <Button type="button" variant="outline" onClick={() => setSessionStep(1)} disabled={isSavingSession}>
                    Retour
                  </Button>
                  <Button type="submit" disabled={isSavingSession}>
                    {isSavingSession ? "Enregistrement..." : sessionForm.id ? "Mettre a jour" : "Creer"}
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={goToSessionStepTwo}>
                  Continuer
                </Button>
              )}
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={parcoursModalOpen} onClose={closeParcoursModal} size="lg">
        <div className="space-y-6 p-1">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {parcoursForm.id ? "Modifier un parcours" : "Nouvel enrollement"}
            </h2>
          </div>

          <form onSubmit={handleSaveParcours} className="grid gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Etudiant</label>
              <select
                value={parcoursForm.student_id}
                onChange={(event) => setParcoursForm((current) => ({ ...current, student_id: event.target.value }))}
                required
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">Selectionner un etudiant</option>
                {studentOptions.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Reference</label>
              <input
                value={parcoursForm.reference}
                onChange={(event) => setParcoursForm((current) => ({ ...current, reference: event.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Statut</label>
              <select
                value={parcoursForm.status}
                onChange={(event) => setParcoursForm((current) => ({ ...current, status: event.target.value as ParcoursFormState["status"] }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="pending">pending</option>
                <option value="ok">ok</option>
                <option value="no">no</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 lg:col-span-2">
              <Button type="button" variant="outline" onClick={closeParcoursModal} disabled={isSavingParcours}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSavingParcours}>
                {isSavingParcours ? "Enregistrement..." : parcoursForm.id ? "Mettre a jour" : "Creer"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={bulkModalOpen} onClose={closeBulkModal} size="xl">
        <div className="space-y-6 p-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Creation bulk des inscriptions</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Colonnes attendues: `email`, `reference`, `status`.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={downloadBulkTemplate}>
              Telecharger le template
            </Button>
          </div>

          <form onSubmit={handleBulkCreateParcours} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Fichier CSV</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleBulkFileChange}
                className="block w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs file:mr-4 file:rounded-md file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-600 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {bulkCsvFileName ? `Fichier charge: ${bulkCsvFileName}` : "Aucun fichier selectionne."}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Apercu du contenu</label>
              <textarea
                rows={12}
                value={bulkCsvContent}
                readOnly
                placeholder="Le contenu du fichier CSV s'affichera ici."
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 font-mono text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeBulkModal} disabled={isBulkCreating}>
                Annuler
              </Button>
              <Button type="submit" disabled={isBulkCreating || !bulkCsvContent.trim()}>
                {isBulkCreating ? "Creation..." : "Creer"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
