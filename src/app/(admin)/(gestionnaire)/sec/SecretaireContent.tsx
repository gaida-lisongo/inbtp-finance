"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createDocumentAction, deleteDocumentAction, getDocumentsAction, notifyDocumentStudentsAction, updateDocumentAction } from "@/app/actions/documents";
import { getPaiementsAction, validatePaiementAction } from "@/app/actions/paiements";
import AsyncProgressButton from "@/components/common/AsyncProgressButton";
import ComponentCard from "@/components/common/ComponentCard";
import Tab from "@/components/common/Tab";
import AppLoader from "@/components/common/AppLoader";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import { getDocumentCategory, type DocumentRecord } from "@/lib/utils/supabase/documents-shared";
import type { PaiementManagementItem } from "@/lib/utils/supabase/paiements";

type SecretaireContentProps = {
  programmeId: string;
};

type DocumentSaveForm = {
  designation: string;
  description: string;
  montant: string;
  categorie: string;
  is_active: string;
};

const initialFormState = (categorie: string): DocumentSaveForm => ({
  designation: "",
  description: "",
  montant: "",
  categorie,
  is_active: "true",
});

const getDocumentTypeLabel = (categorie: string) => {
  const normalized = categorie.trim().toLowerCase();

  if (normalized === "relevés" || normalized === "releves") {
    return "Relevé";
  }

  if (normalized === "fiche de validation") {
    return "Fiche de validation";
  }

  return categorie;
};

const getNotificationErrorMessage = (message: string) => {
  switch (message) {
    case "access_denied":
      return "Acces refuse a la notification des etudiants.";
    case "document_not_found":
      return "Le document a notifier est introuvable.";
    case "document_notification_no_student_email":
      return "Aucun email etudiant exploitable pour cette promotion.";
    case "graph_mail_sender_not_configured":
      return "L'adresse emettrice Microsoft 365 n'est pas configuree.";
    default:
      return message;
  }
};

export default function SecretaireContent({ programmeId }: SecretaireContentProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [paiements, setPaiements] = useState<PaiementManagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentRecord | null>(null);
  const [documentForm, setDocumentForm] = useState<DocumentSaveForm>(initialFormState("Fiche de validation"));
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [validatingPaiementId, setValidatingPaiementId] = useState<string | null>(null);

  const releves = useMemo(
    () => documents.filter((document) => getDocumentCategory(document).toLowerCase() === "relevés" || getDocumentCategory(document).toLowerCase() === "releves"),
    [documents],
  );
  const fichesValidation = useMemo(
    () => documents.filter((document) => getDocumentCategory(document).toLowerCase() === "fiche de validation"),
    [documents],
  );

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [documentsData, paiementsData] = await Promise.all([getDocumentsAction(programmeId), getPaiementsAction(programmeId)]);
      setDocuments(documentsData);
      setPaiements(paiementsData);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Erreur lors du chargement des donnees.",
      });
    } finally {
      setLoading(false);
    }
  }, [programmeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateModal = (categorie: string) => {
    setEditingDocument(null);
    setDocumentForm(initialFormState(categorie));
    setDocumentModalOpen(true);
  };

  const openEditModal = (document: DocumentRecord) => {
    setEditingDocument(document);
    setDocumentForm({
      designation: document.designation || "",
      description: document.description || "",
      montant: document.montant?.toString() || "",
      categorie: getDocumentCategory(document),
      is_active: document.is_active || "true",
    });
    setDocumentModalOpen(true);
  };

  const handleDeleteDocument = async (document: DocumentRecord) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce document ?")) {
      return;
    }

    try {
      await deleteDocumentAction(document.id);
      setFeedback({ type: "success", message: "Document supprime avec succes." });
      await loadData();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Erreur lors de la suppression.",
      });
    }
  };

  const handleSubmitDocument = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const formData = new FormData();
      formData.append("designation", documentForm.designation);
      formData.append("description", documentForm.description);
      formData.append("montant", documentForm.montant);
      formData.append("categorie", documentForm.categorie);
      formData.append("is_active", documentForm.is_active);

      if (editingDocument) {
        await updateDocumentAction(editingDocument.id, programmeId, formData);
        setFeedback({ type: "success", message: "Document mis a jour avec succes." });
      } else {
        await createDocumentAction(programmeId, formData);
        setFeedback({ type: "success", message: "Document cree avec succes." });
      }

      setDocumentModalOpen(false);
      await loadData();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Erreur lors de l'enregistrement du document.",
      });
    }
  };

  const handleValidatePaiement = async (paiement: PaiementManagementItem) => {
    if (validatingPaiementId) {
      return;
    }

    setValidatingPaiementId(paiement.id);

    try {
      const result = await validatePaiementAction(programmeId, paiement.id);
      setFeedback({
        type: "success",
        message: `Paiement valide avec succes. OrderNumber: ${result.orderNumber}.`,
      });
      await loadData();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Impossible de valider le paiement.",
      });
    } finally {
      setValidatingPaiementId(null);
    }
  };

  const renderPaiementsTable = (items: PaiementManagementItem[]) => (
    <ComponentCard title="Validation manuelle des paiements">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total paiements</p>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{items.length}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">En attente</p>
            <p className="mt-2 text-2xl font-semibold text-warning-600 dark:text-warning-300">
              {items.filter((item) => item.status !== "success").length}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Montant en attente</p>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {items
                .filter((item) => item.status !== "success")
                .reduce((sum, item) => sum + (item.amount ?? 0), 0)
                .toLocaleString("fr-FR")}{" "}
              USD
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Date
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Etudiant
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Produit
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  OrderNumber
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Montant
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Statut
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((paiement) => (
                <TableRow key={paiement.id}>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(paiement.createdAt).toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
                    {paiement.student?.fullName ?? "Etudiant inconnu"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="font-medium text-gray-800 dark:text-white/90">{paiement.product}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{paiement.categorie ?? "categorie"}</div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {paiement.orderNumber ?? paiement.id}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {typeof paiement.amount === "number" ? `${paiement.amount.toLocaleString("fr-FR")} USD` : "Non renseigne"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        paiement.status === "success"
                          ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
                          : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300"
                      }`}
                    >
                      {paiement.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex justify-end">
                      <Button
                        onClick={() => void handleValidatePaiement(paiement)}
                        disabled={paiement.status === "success" || validatingPaiementId === paiement.id}
                      >
                        {paiement.status === "success"
                          ? "Valide"
                          : validatingPaiementId === paiement.id
                            ? "Validation..."
                            : "Valider le paiement"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {items.length === 0 ? (
                <TableRow>
                  <td colSpan={7} className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                    Aucun paiement disponible pour cette promotion.
                  </td>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </ComponentCard>
  );

  const renderDocumentTable = (items: DocumentRecord[], searchPlaceholder: string, addLabel: string, categorie: string) => (
    <ComponentCard title={`Gestion des ${categorie}`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Documents</p>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{items.length}</p>
          </div>

          <Button onClick={() => openCreateModal(categorie)}>{addLabel}</Button>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Designation
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Type
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Montant
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Statut
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((document) => {
                const category = getDocumentCategory(document);

                return (
                  <TableRow key={document.id}>
                    <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {document.designation || "Sans designation"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {category}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {document.montant != null ? `${document.montant} USD` : "Non renseigne"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {document.is_active === "true" ? "Actif" : "Inactif"}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <AsyncProgressButton
                          action={() => notifyDocumentStudentsAction(programmeId, document.id)}
                          idleLabel="Notifier les etudiants"
                          progressMessages={[
                            "Preparation...",
                            "Chargement des inscrits...",
                            "Envoi des emails...",
                            "Finalisation...",
                          ]}
                          onSuccess={(result) => {
                            setFeedback({
                              type: "success",
                              message: `${result.notifiedCount} etudiant(s) notifie(s) pour ${result.category}. ${result.skippedCount > 0 ? `${result.skippedCount} sans email.` : ""}`.trim(),
                            });
                          }}
                          onError={(error) => {
                            setFeedback({
                              type: "error",
                              message: getNotificationErrorMessage(error.message),
                            });
                          }}
                          className="px-3 py-2"
                        />
                        <button
                          type="button"
                          onClick={() => openEditModal(document)}
                          className="text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteDocument(document)}
                          className="text-sm font-medium text-error-500 hover:text-error-600"
                        >
                          Supprimer
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {items.length === 0 ? (
                <TableRow>
                  <td colSpan={5} className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                    Aucun element dans {searchPlaceholder.toLowerCase()}.
                  </td>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </ComponentCard>
  );

  if (loading) {
    return <AppLoader label="Chargement des documents..." />;
  }

  return (
    <>
      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300"
              : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <Tab
        tabs={[
          {
            key: "paiements",
            label: "Paiements",
            content: renderPaiementsTable(paiements),
          },
          {
            key: "releves",
            label: "Relevés",
            content: renderDocumentTable(releves, "les relevés", "Ajouter releve", "Relevés"),
          },
          {
            key: "fiches-validation",
            label: "Fiches de validation",
            content: renderDocumentTable(
              fichesValidation,
              "les fiches de validation",
              "Ajouter fiche de validation",
              "Fiche de validation",
            ),
          },
        ]}
      />

      <Modal isOpen={documentModalOpen} onClose={() => setDocumentModalOpen(false)} className="m-4 max-w-[720px]">
        <div className="p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            {editingDocument ? `Modifier ${getDocumentTypeLabel(documentForm.categorie)}` : `Nouveau ${getDocumentTypeLabel(documentForm.categorie)}`}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Le bouton de notification permettra ensuite de prevenir tous les etudiants inscrits a cette promotion.
          </p>

          <form onSubmit={handleSubmitDocument} className="mt-6 grid gap-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="document-designation">
                Designation
              </label>
              <input
                id="document-designation"
                type="text"
                value={documentForm.designation}
                onChange={(event) => setDocumentForm((current) => ({ ...current, designation: event.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="document-description">
                Description
              </label>
              <textarea
                id="document-description"
                rows={4}
                value={documentForm.description}
                onChange={(event) => setDocumentForm((current) => ({ ...current, description: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="document-montant">
                Montant
              </label>
              <input
                id="document-montant"
                type="number"
                value={documentForm.montant}
                onChange={(event) => setDocumentForm((current) => ({ ...current, montant: event.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="document-status">
                Actif
              </label>
              <select
                id="document-status"
                value={documentForm.is_active}
                onChange={(event) => setDocumentForm((current) => ({ ...current, is_active: event.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDocumentModalOpen(false)}
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Annuler
              </button>
              <Button type="submit">{editingDocument ? "Mettre a jour" : "Creer"}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
