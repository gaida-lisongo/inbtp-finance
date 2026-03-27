"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { deleteProgramme, saveProgramme } from "@/lib/utils/supabase/programmes";

export async function saveProgrammeAction(formData: FormData) {
  try {
    await saveProgramme(formData);
    redirect("/programmes?status=success");
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "programme_save_failed";
    redirect(`/programmes?status=error&message=${encodeURIComponent(message)}`);
  }
}

export async function deleteProgrammeAction(formData: FormData) {
  try {
    const id = formData.get("id");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("programme_id_required");
    }

    await deleteProgramme(id);
    redirect("/programmes?status=success");
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "programme_delete_failed";
    redirect(`/programmes?status=error&message=${encodeURIComponent(message)}`);
  }
}
