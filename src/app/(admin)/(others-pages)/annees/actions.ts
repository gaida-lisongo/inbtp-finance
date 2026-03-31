"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { deleteAnnee, saveAnnee, updateAnneeActiveState } from "@/lib/utils/supabase/annees";

export async function saveAnneeAction(formData: FormData) {
  try {
    await saveAnnee(formData);
    redirect("/annees?status=success");
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "annee_save_failed";
    redirect(`/annees?status=error&message=${encodeURIComponent(message)}`);
  }
}

export async function deleteAnneeAction(formData: FormData) {
  try {
    const id = formData.get("id");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("annee_id_required");
    }

    await deleteAnnee(id);
    redirect("/annees?status=success");
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "annee_delete_failed";
    redirect(`/annees?status=error&message=${encodeURIComponent(message)}`);
  }
}

export async function updateAnneeActiveAction(formData: FormData) {
  try {
    const id = formData.get("id");
    const active = formData.get("active");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("annee_id_required");
    }

    await updateAnneeActiveState(id, active === "true");
    redirect("/annees?status=success");
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "annee_active_update_failed";
    redirect(`/annees?status=error&message=${encodeURIComponent(message)}`);
  }
}
