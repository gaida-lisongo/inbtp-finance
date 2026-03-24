"use server";

import { redirect } from "next/navigation";

import { createAzureSignInUrl } from "@/lib/utils/supabase/auth";

export async function signInWithAzureAction(formData: FormData) {
  const nextPath = formData.get("next");
  const { authorizationUrl } = await createAzureSignInUrl(
    typeof nextPath === "string" ? nextPath : null,
  );

  redirect(authorizationUrl);
}
