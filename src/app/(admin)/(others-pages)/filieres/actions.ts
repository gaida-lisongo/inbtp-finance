"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { deleteFiliere, saveFiliere } from "@/lib/utils/supabase/filieres";

export async function saveFiliereAction(formData: FormData) {
  try {
    await saveFiliere(formData);
    redirect("/filieres?status=success");
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "filiere_save_failed";
    redirect(`/filieres?status=error&message=${encodeURIComponent(message)}`);
  }
}

export async function deleteFiliereAction(formData: FormData) {
  try {
    const id = formData.get("id");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("filiere_id_required");
    }

    await deleteFiliere(id);
    redirect("/filieres?status=success");
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "filiere_delete_failed";
    redirect(`/filieres?status=error&message=${encodeURIComponent(message)}`);
  }
}
