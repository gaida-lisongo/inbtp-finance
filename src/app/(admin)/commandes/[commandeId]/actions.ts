"use server";

import { revalidatePath, unstable_rethrow } from "next/navigation";

import { updateFacultyCommandeStatus } from "@/lib/utils/supabase/faculty-commandes";

const normalizeStatus = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase();

  if (trimmed === "pending" || trimmed === "success" || trimmed === "no") {
    return trimmed as "pending" | "success" | "no";
  }

  return null;
};

export async function updateCommandeStatusAction(formData: FormData) {
  try {
    const commandeId = typeof formData.get("commande_id") === "string" ? String(formData.get("commande_id")) : "";
    const status = normalizeStatus(formData.get("status"));

    if (!commandeId || !status) {
      throw new Error("invalid_status_payload");
    }

    await updateFacultyCommandeStatus(commandeId, status);

    revalidatePath("/");
    revalidatePath(`/commandes/${commandeId}`);
  } catch (error) {
    unstable_rethrow(error);
    throw error instanceof Error ? error : new Error("faculty_commande_status_update_failed");
  }
}
