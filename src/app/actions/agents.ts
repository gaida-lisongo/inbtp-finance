"use server";

import { revalidatePath } from "next/cache";
import { getAllAgents, createAgent, updateAgent, deleteAgent, normalizeAgentRole } from "@/lib/utils/supabase/agents";
import type { AgentRole, AgentRecord } from "@/lib/utils/supabase/agents-shared";

export async function getAgentsAction() {
  try {
    return await getAllAgents();
  } catch (error) {
    console.error("Error fetching agents:", error);
    throw new Error("Failed to fetch agents");
  }
}

export async function createAgentAction(formData: FormData) {
  try {
    const agentData = {
      nom: formData.get("nom") as string,
      post_nom: formData.get("post_nom") as string,
      prenom: formData.get("prenom") as string,
      email: formData.get("email") as string,
      grade: formData.get("grade") as string,
      role: formData.get("role") as string,
    };

    const newAgent = await createAgent(agentData);
    revalidatePath("/sec");
    return newAgent;
  } catch (error) {
    console.error("Error creating agent:", error);
    throw new Error("Failed to create agent");
  }
}

export type BulkCreateAgentInput = {
  nom: string;
  post_nom: string | null;
  prenom: string;
  email: string;
  grade: string | null;
  role: AgentRole | null;
};

export type BulkCreateAgentsResult = {
  created: AgentRecord[];
  errors: Array<{ index: number; email: string | null; message: string }>;
};

export async function bulkCreateAgentsAction(agents: BulkCreateAgentInput[]): Promise<BulkCreateAgentsResult> {
  const created: AgentRecord[] = [];
  const errors: BulkCreateAgentsResult["errors"] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (let index = 0; index < agents.length; index += 1) {
    const agent = agents[index]!;
    const email = agent.email?.trim() ?? "";
    const normalizedRole = normalizeAgentRole(agent.role ?? undefined) ?? "titulaire";

    try {
      const nom = agent.nom?.trim() ?? "";
      const prenom = agent.prenom?.trim() ?? "";

      if (!nom || !prenom || !email) {
        errors.push({ index, email: email || null, message: "Champs requis manquants (nom, prenom, email)." });
        continue;
      }

      if (!emailRegex.test(email)) {
        errors.push({ index, email: email || null, message: "Email invalide." });
        continue;
      }

      const record = await createAgent({
        nom,
        post_nom: agent.post_nom?.trim() || null,
        prenom,
        email,
        grade: agent.grade?.trim() || null,
        role: normalizedRole,
      });
      created.push(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ index, email: email || null, message });
    }
  }

  if (created.length > 0) {
    revalidatePath("/sec");
    revalidatePath("/agents");
  }

  return { created, errors };
}

export async function updateAgentAction(id: string, formData: FormData) {
  try {
    const updates = {
      nom: formData.get("nom") as string,
      post_nom: formData.get("post_nom") as string,
      prenom: formData.get("prenom") as string,
      email: formData.get("email") as string,
      grade: formData.get("grade") as string,
      role: formData.get("role") as string,
    };

    const updatedAgent = await updateAgent(id, updates);
    revalidatePath("/sec");
    return updatedAgent;
  } catch (error) {
    console.error("Error updating agent:", error);
    throw new Error("Failed to update agent");
  }
}

export async function deleteAgentAction(id: string) {
  try {
    await deleteAgent(id);
    revalidatePath("/sec");
  } catch (error) {
    console.error("Error deleting agent:", error);
    throw new Error("Failed to delete agent");
  }
}
