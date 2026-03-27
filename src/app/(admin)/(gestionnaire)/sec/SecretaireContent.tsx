"use client";

import React, { useState, useEffect } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import Tab from "@/components/common/Tab";
import DataTable from "@/components/common/DataTable";
import { Modal } from "@/components/ui/modal";
import Form from "@/components/form/Form";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { AgentRecord } from "@/lib/utils/supabase/agents";
import { DocumentRecord } from "@/lib/utils/supabase/documents";
import { getAgentsAction, createAgentAction, updateAgentAction, deleteAgentAction } from "@/app/actions/agents";
import { getDocumentsAction, createDocumentAction, updateDocumentAction, deleteDocumentAction } from "@/app/actions/documents";

interface SecretaireContentProps {
  programmeId: string;
}

export default function SecretaireContent({ programmeId }: SecretaireContentProps) {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);
  const [editingDocument, setEditingDocument] = useState<DocumentRecord | null>(null);

  // Forms
  const [agentForm, setAgentForm] = useState({
    nom: "",
    post_nom: "",
    prenom: "",
    email: "",
    grade: "",
  });

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
      const [agentsData, documentsData] = await Promise.all([
        getAgentsAction(),
        getDocumentsAction(programmeId),
      ]);
      setAgents(agentsData);
      setDocuments(documentsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = () => {
    setEditingAgent(null);
    setAgentForm({
      nom: "",
      post_nom: "",
      prenom: "",
      email: "",
      grade: "",
    });
    setAgentModalOpen(true);
  };

  const handleEditAgent = (agent: AgentRecord) => {
    setEditingAgent(agent);
    setAgentForm({
      nom: agent.nom || "",
      post_nom: agent.post_nom || "",
      prenom: agent.prenom || "",
      email: agent.email || "",
      grade: agent.grade || "",
    });
    setAgentModalOpen(true);
  };

  const handleDeleteAgent = async (agent: AgentRecord) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet agent ?")) {
      try {
        await deleteAgentAction(agent.id);
        loadData(); // Reload data
      } catch (error) {
        console.error("Error deleting agent:", error);
        alert("Erreur lors de la suppression");
      }
    }
  };

  const handleSubmitAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("nom", agentForm.nom);
      formData.append("post_nom", agentForm.post_nom);
      formData.append("prenom", agentForm.prenom);
      formData.append("email", agentForm.email);
      formData.append("grade", agentForm.grade);

      if (editingAgent) {
        await updateAgentAction(editingAgent.id, formData);
      } else {
        await createAgentAction(formData);
      }
      setAgentModalOpen(false);
      loadData(); // Reload data
    } catch (error) {
      console.error("Error saving agent:", error);
      alert("Erreur lors de la sauvegarde");
    }
  };

  const handleAddDocument = () => {
    setEditingDocument(null);
    setDocumentForm({
      designation: "",
      description: "",
      montant: "",
      categorie: "Fiche de validation",
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

  const agentColumns = [
    {
      key: "nom_complet",
      label: "Nom complet",
      render: (agent: AgentRecord) => `${agent.prenom || ""} ${agent.post_nom || ""} ${agent.nom || ""}`.trim(),
    },
    { key: "email", label: "Email" },
    { key: "grade", label: "Grade" },
  ];

  const documentColumns = [
    { key: "designation", label: "Désignation" },
    { key: "description", label: "Description" },
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
            key: "agents",
            label: "Agents",
            content: (
              <ComponentCard title="Gestion des Agents">
                <DataTable
                  data={agents}
                  columns={agentColumns}
                  searchPlaceholder="Rechercher un agent..."
                  onAdd={handleAddAgent}
                  onEdit={handleEditAgent}
                  onDelete={handleDeleteAgent}
                  addButtonLabel="Ajouter Agent"
                />
              </ComponentCard>
            ),
          },
          {
            key: "documents",
            label: "Documents",
            content: (
              <ComponentCard title="Gestion des Documents">
                <DataTable
                  data={documents}
                  columns={documentColumns}
                  searchPlaceholder="Rechercher un document..."
                  onAdd={handleAddDocument}
                  onEdit={handleEditDocument}
                  onDelete={handleDeleteDocument}
                  addButtonLabel="Ajouter Document"
                />
              </ComponentCard>
            ),
          },
        ]}
      />

      {/* Agent Modal */}
      <Modal isOpen={agentModalOpen} onClose={() => setAgentModalOpen(false)}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingAgent ? "Modifier Agent" : "Ajouter Agent"}
          </h2>
          <Form onSubmit={handleSubmitAgent}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom</Label>
                <input
                  id="nom"
                  type="text"
                  value={agentForm.nom}
                  onChange={(e) => setAgentForm({ ...agentForm, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <Label htmlFor="post_nom">Post-nom</Label>
                <input
                  id="post_nom"
                  type="text"
                  value={agentForm.post_nom}
                  onChange={(e) => setAgentForm({ ...agentForm, post_nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <Label htmlFor="prenom">Prénom</Label>
                <input
                  id="prenom"
                  type="text"
                  value={agentForm.prenom}
                  onChange={(e) => setAgentForm({ ...agentForm, prenom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <input
                  id="email"
                  type="email"
                  value={agentForm.email}
                  onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <Label htmlFor="grade">Grade académique</Label>
                <input
                  id="grade"
                  type="text"
                  value={agentForm.grade}
                  onChange={(e) => setAgentForm({ ...agentForm, grade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setAgentModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                {editingAgent ? "Modifier" : "Ajouter"}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* Document Modal */}
      <Modal isOpen={documentModalOpen} onClose={() => setDocumentModalOpen(false)}>
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
              <div>
                <Label htmlFor="categorie">Catégorie</Label>
                <select
                  id="categorie"
                  value={documentForm.categorie}
                  onChange={(e) => setDocumentForm({ ...documentForm, categorie: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Fiche de validation">Fiche de validation</option>
                  <option value="Relevés">Relevés</option>
                </select>
              </div>
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