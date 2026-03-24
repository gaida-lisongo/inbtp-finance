"use server";

import { redirect } from "next/navigation";

import { getSafeNextPath } from "@/lib/utils/supabase/auth";

export async function signInWithAzureAction(formData: FormData) {
  const nextPath = formData.get("next");
  const safeNextPath = getSafeNextPath(typeof nextPath === "string" ? nextPath : null);

  redirect(`/api/login?next=${encodeURIComponent(safeNextPath)}`);
}
