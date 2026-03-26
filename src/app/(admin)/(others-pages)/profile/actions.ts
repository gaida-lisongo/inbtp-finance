"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { updateCurrentAgentProfile } from "@/lib/utils/supabase/agents";

export async function updateProfileAction(formData: FormData) {
  try {
    await updateCurrentAgentProfile(formData);
    redirect("/profile?status=success");
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "profile_update_failed";
    redirect(`/profile?status=error&message=${encodeURIComponent(message)}`);
  }
}
