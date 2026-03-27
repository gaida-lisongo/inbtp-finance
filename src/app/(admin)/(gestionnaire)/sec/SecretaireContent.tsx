"use client";

import React, { useState, useEffect } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import Tab from "@/components/common/Tab";
import DataTable from "@/components/common/DataTable";
import { Modal } from "@/components/ui/modal";
import Form from "@/components/form/Form";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { DocumentRecord } from "@/lib/utils/supabase/documents";
import { getDocumentsAction, createDocumentAction, updateDocumentAction, deleteDocumentAction } from "@/app/actions/documents";

interface SecretaireContentProps {
  programmeId: string;
}

export default function SecretaireContent({ programmeId }: SecretaireContentProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const releves = documents.filter(doc => (doc.caracteristique as any)?.categorie === "Relevés");
  const fichesValidation = documents.filter(doc => (doc.caracteristique as any)?.categorie === "Fiche de validation");
  const [loading, setLoading] = useState(true);

  // Modals
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentRecord | null>(null);

  // Forms
  const [documentForm, setDocumentForm] = useState({
    designation: "",
    description: "",
    montant: "",
    categorie: "Fiche de validation",
    is_active: "true",
  });

  useEffect(() => {
    loadData();
  }, [programmeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const documentsData = await getDocumentsAction(programmeId);
      setDocuments(documentsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = (categorie: string) => {
    setEditingDocument(null);
    setDocumentForm({
      designation: "",
      description: "",
      montant: "",
      categorie,
      is_active: "true",
    });
    setDocumentModalOpen(true);
  };

  const handleEditDocument = (document: DocumentRecord) => {
    setEditingDocument(document);
    const categorie = (document.caracteristique as any)?.categorie || "Fiche de validation";
    setDocumentForm({
      designation: document.designation || "",
      description: document.description || "",
      montant: document.montant?.toString() || "",
      categorie,
      is_active: document.is_active || "true",
    });
    setDocumentModalOpen(true);
  };

  const handleDeleteDocument = async (document: DocumentRecord) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
      try {
        await deleteDocumentAction(document.id);
        loadData(); // Reload data
      } catch (error) {
        console.error("Error deleting document:", error);
        alert("Erreur lors de la suppression");
      }
    }
  };

  const handleSubmitDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("designation", documentForm.designation);
      formData.append("description", documentForm.description);
      formData.append("montant", documentForm.montant);
      formData.append("categorie", documentForm.categorie);
      formData.append("is_active", documentForm.is_active);

      if (editingDocument) {
        await updateDocumentAction(editingDocument.id, programmeId, formData);
      } else {
        await createDocumentAction(programmeId, formData);
      }
      setDocumentModalOpen(false);
      loadData(); // Reload data
    } catch (error) {
      console.error("Error saving document:", error);
      alert("Erreur lors de la sauvegarde");
    }
  };

  const documentColumns = [
    { key: "designation", label: "Désignation" },
    // { key: "description", label: "Description" }, // Masqué selon la demande
    {
      key: "categorie",
      label: "Catégorie",
      render: (doc: DocumentRecord) => (doc.caracteristique as any)?.categorie || "",
    },
    {
      key: "montant",
      label: "Montant",
      render: (doc: DocumentRecord) => doc.montant ? `$${doc.montant} USD` : "",
    },
    {
      key: "is_active",
      label: "Actif",
      render: (doc: DocumentRecord) => doc.is_active === "true" ? "Oui" : "Non",
    },
  ];

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <>
      <Tab
        tabs={[
          {
            key: "releves",
            label: "Relevés",
            content: (
              <ComponentCard title="Gestion des Relevés">
                <DataTable
                  data={releves}
                  columns={documentColumns}
                  searchPlaceholder="Rechercher un relevé..."
                  onAdd={() => handleAddDocument("Relevés")}
                  onEdit={handleEditDocument}
                  onDelete={handleDeleteDocument}
                  addButtonLabel="Ajouter Relevé"
                />
              </ComponentCard>
            ),
          },
          {
            key: "fiches-validation",
            label: "Fiches de validation",
            content: (
              <ComponentCard title="Gestion des Fiches de validation">
                <DataTable
                  data={fichesValidation}
                  columns={documentColumns}
                  searchPlaceholder="Rechercher une fiche de validation..."
                  onAdd={() => handleAddDocument("Fiche de validation")}
                  onEdit={handleEditDocument}
                  onDelete={handleDeleteDocument}
                  addButtonLabel="Ajouter Fiche de validation"
                />
              </ComponentCard>
            ),
          },
        ]}
      />

      {/* Document Modal */}
      <Modal isOpen={documentModalOpen} onClose={() => setDocumentModalOpen(false)} size="lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingDocument ? "Modifier Document" : "Ajouter Document"}
          </h2>
          <Form onSubmit={handleSubmitDocument}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="designation">Désignation</Label>
                <input
                  id="designation"
                  type="text"
                  value={documentForm.designation}
                  onChange={(e) => setDocumentForm({ ...documentForm, designation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={documentForm.description}
                  onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="montant">Montant</Label>
                <input
                  id="montant"
                  type="number"
                  value={documentForm.montant}
                  onChange={(e) => setDocumentForm({ ...documentForm, montant: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              {/* Catégorie masquée car déterminée par l'onglet */}
              <input type="hidden" name="categorie" value={documentForm.categorie} />
              <div>
                <Label htmlFor="is_active">Actif</Label>
                <select
                  id="is_active"
                  value={documentForm.is_active}
                  onChange={(e) => setDocumentForm({ ...documentForm, is_active: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setDocumentModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                {editingDocument ? "Modifier" : "Ajouter"}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </>
  );
}