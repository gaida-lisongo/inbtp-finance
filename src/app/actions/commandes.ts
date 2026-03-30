"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { createAdminClient } from "@/lib/utils/supabase/admin";

/**
 * Bulk update commande status
 * Update multiple commandes to a new status (e.g., pending -> delivered)
 */
export async function bulkUpdateCommandeStatusAction(
  ids: string[],
  newStatus: "delivered" | "success" | string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.canAccessAdmin) {
      throw new Error("Accès non autorisé");
    }

    if (!ids || ids.length === 0) {
      throw new Error("Aucune commande sélectionnée");
    }

    const admin = createAdminClient();

    // Update all selected commandes
    const { error } = await admin
      .from("commande")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard");
    revalidatePath("/cr");

    return {
      success: true,
      count: ids.length,
    };
  } catch (err) {
    console.error("Bulk update commande error:", err);
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "Erreur lors de la mise à jour",
    };
  }
}

/**
 * Update single commande status
 * Convenience wrapper around bulkUpdateCommandeStatusAction for single updates
 */
export async function updateCommandeStatusAction(
  id: string,
  newStatus: "delivered" | "success" | string
): Promise<{ success: boolean; error?: string }> {
  const result = await bulkUpdateCommandeStatusAction([id], newStatus);
  return {
    success: result.success,
    error: result.error,
  };
}
