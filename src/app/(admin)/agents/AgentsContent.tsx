"use client";

import React, { useState, useEffect } from "react";
import DataTable from "@/components/common/DataTable";
import { Modal } from "@/components/ui/modal";
import Form from "@/components/form/Form";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import type { AgentRecord } from "@/lib/utils/supabase/agents-shared";
import { getAgentsAction, createAgentAction, updateAgentAction, deleteAgentAction } from "@/app/actions/agents";

export default function AgentsContent() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);

  // Forms
  const [agentForm, setAgentForm] = useState({
    nom: "",
    post_nom: "",
    prenom: "",
    email: "",
    grade: "",
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const agentsData = await getAgentsAction();
      setAgents(agentsData);
    } catch (error) {
      console.error("Error loading agents:", error);
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
        loadAgents(); // Reload data
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
      loadAgents(); // Reload data
    } catch (error) {
      console.error("Error saving agent:", error);
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
    { key: "role", label: "Rôle" },
  ];

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <>
      <DataTable
        data={agents}
        columns={agentColumns}
        searchPlaceholder="Rechercher un agent..."
        onAdd={handleAddAgent}
        onEdit={handleEditAgent}
        onDelete={handleDeleteAgent}
        addButtonLabel="Ajouter Agent"
      />

      {/* Agent Modal */}
      <Modal isOpen={agentModalOpen} onClose={() => setAgentModalOpen(false)} size="lg">
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
                  type="text"
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
    </>
  );
}
