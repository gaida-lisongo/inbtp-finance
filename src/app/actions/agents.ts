"use server";

import { revalidatePath } from "next/cache";
import { getAllAgents, createAgent, updateAgent, deleteAgent } from "@/lib/utils/supabase/agents";

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
    };

    const newAgent = await createAgent(agentData);
    revalidatePath("/sec");
    return newAgent;
  } catch (error) {
    console.error("Error creating agent:", error);
    throw new Error("Failed to create agent");
  }
}

export async function updateAgentAction(id: string, formData: FormData) {
  try {
    const updates = {
      nom: formData.get("nom") as string,
      post_nom: formData.get("post_nom") as string,
      prenom: formData.get("prenom") as string,
      email: formData.get("email") as string,
      grade: formData.get("grade") as string,
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