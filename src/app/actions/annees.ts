"use server";

import { getAnnees, saveAnnee, deleteAnnee, updateAnneeActiveState, getAnneeById } from "@/lib/utils/supabase/annees";
import { revalidatePath } from "next/cache";

export async function getAnneesAction() {
  try {
    return await getAnnees();
  } catch (error) {
    console.error("Error fetching annees:", error);
    throw new Error("Failed to fetch annees");
  }
}

export async function createAnneeAction(payload: any) {
  try {
    const formData = new FormData();
    formData.append("designation", payload.designation || "");
    formData.append("date_debut", payload.date_debut || "");
    formData.append("date_fin", payload.date_fin || "");
    formData.append("description", payload.description || "");
    
    await saveAnnee(formData);
    revalidatePath("/annees");
    
    // Fetch the newly created annee (we don't have the ID easily, but usually it's the latest or we can fetch all)
    // Actually, saveAnnee doesn't return the ID. Let's return the latest annee or null.
    const all = await getAnnees();
    return all[0]; // Assuming order is descending by creation
  } catch (error) {
    console.error("Error creating annee:", error);
    throw error;
  }
}

export async function updateAnneeAction(payload: any) {
  try {
    const formData = new FormData();
    formData.append("id", payload.id);
    formData.append("designation", payload.designation || "");
    formData.append("date_debut", payload.date_debut || "");
    formData.append("date_fin", payload.date_fin || "");
    formData.append("description", payload.description || "");
    
    await saveAnnee(formData);
    revalidatePath("/annees");
    return await getAnneeById(payload.id);
  } catch (error) {
    console.error("Error updating annee:", error);
    throw error;
  }
}

export async function deleteAnneeAction(id: string) {
  try {
    await deleteAnnee(id);
    revalidatePath("/annees");
    return true;
  } catch (error) {
    console.error("Error deleting annee:", error);
    throw error;
  }
}

export async function toggleAnneeActiveAction(id: string, active: boolean) {
  try {
    await updateAnneeActiveState(id, active);
    revalidatePath("/annees");
    return await getAnneeById(id);
  } catch (error) {
    console.error("Error toggling annee state:", error);
    throw error;
  }
}
