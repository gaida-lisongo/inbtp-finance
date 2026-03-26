"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { deleteAutorisation, saveAutorisation } from "@/lib/utils/supabase/autorisations";

export async function saveAutorisationAction(formData: FormData) {
  try {
    await saveAutorisation(formData);
    redirect("/autorisations?status=success");
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "autorisation_save_failed";
    redirect(`/autorisations?status=error&message=${encodeURIComponent(message)}`);
  }
}

export async function deleteAutorisationAction(formData: FormData) {
  try {
    const id = formData.get("id");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("autorisation_id_required");
    }

    await deleteAutorisation(id);
    redirect("/autorisations?status=success");
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "autorisation_delete_failed";
    redirect(`/autorisations?status=error&message=${encodeURIComponent(message)}`);
  }
}
