"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createAzureSignInUrl } from "@/lib/utils/supabase/auth";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

export async function signInWithAzureAction(formData: FormData) {
  const nextPath = formData.get("next");
  const { authorizationUrl } = await createAzureSignInUrl(
    typeof nextPath === "string" ? nextPath : null,
  );

  redirect(authorizationUrl);
}

export async function signOutAction() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  await supabase.auth.signOut();
  redirect("/signin");
}
