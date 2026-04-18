"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import {
  clearLoginModeCookie,
  getAuthCallbackUrl,
  getSafeNextPath,
  setLoginModeCookie,
} from "@/lib/utils/supabase/auth";
import { attachStudentUserByEmail } from "@/lib/utils/supabase/students";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";
import { createAdminClient } from "@/lib/utils/supabase/admin";

const HOST = process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "") || "http://localhost:3000";

const getFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const buildRedirect = (nextPath: string, error?: string) => {
  const search = new URLSearchParams();
  if (nextPath && nextPath !== "/") search.set("next", nextPath);
  search.set("tab", "student");
  if (error) search.set("error", error);
  return `/signup?${search.toString()}`;
};

const createMailAccount = async (email: string, password: string) => {
  const response = await fetch(`${HOST}/api/mail/account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "mail_account_failed");
  }
};

export async function signUpStudentWizardAction(formData: FormData) {
  const nextPath = getSafeNextPath(getFormValue(formData, "next") || null);
  const studentId = getFormValue(formData, "student_id");
  const prenom = getFormValue(formData, "prenom");
  const ville = getFormValue(formData, "ville");
  const pays = getFormValue(formData, "pays");
  const date_naissance = getFormValue(formData, "date_naissance");
  const telephone = getFormValue(formData, "telephone");
  const commune = getFormValue(formData, "commune");
  const adresse = getFormValue(formData, "adresse");
  const sexe = getFormValue(formData, "sexe");
  const bio = getFormValue(formData, "bio");
  const photoDataUrl = getFormValue(formData, "photo");
  const password = getFormValue(formData, "password");
  const confirmPassword = getFormValue(formData, "confirm_password");

  if (!studentId || !password || !confirmPassword) {
    redirect(buildRedirect(nextPath, "missing_signup_fields"));
  }

  if (password.length < 6) {
    redirect(buildRedirect(nextPath, "password_too_short"));
  }

  if (password !== confirmPassword) {
    redirect(buildRedirect(nextPath, "password_mismatch"));
  }

  const admin = createAdminClient();
  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, email, user_id, nom, post_nom, grade")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    redirect(buildRedirect(nextPath, "student_not_found"));
  }

  if (!student || !student.email) {
    redirect(buildRedirect(nextPath, "student_not_found"));
  }

  if (student.user_id) {
    redirect(buildRedirect(nextPath, "student_already_registered"));
  }

  try {
    await createMailAccount(student.email.toLowerCase(), password);
  } catch (error) {
    const message = error instanceof Error ? error.message : "mail_account_failed";
    redirect(buildRedirect(nextPath, message));
  }

  await setLoginModeCookie("student_password");
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const confirmationPath = `/signin?message=${encodeURIComponent("student_email_confirmed")}&tab=student${
    nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : ""
  }`;
  const { callbackUrl } = await getAuthCallbackUrl(confirmationPath, "student_password");

  const { data, error } = await supabase.auth.signUp({
    email: student.email.toLowerCase(),
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: {
        nom: student.nom,
        post_nom: student.post_nom,
        grade: student.grade,
        sexe: sexe || null,
        date_naissance: date_naissance || null,
        ville: ville || null,
        pays: pays || null,
        telephone: telephone || null,
      },
    },
  });

  if (error) {
    await clearLoginModeCookie();
    redirect(buildRedirect(nextPath, error.message));
  }

  // Update student profile fields
  await admin
    .from("students")
    .update({
      prenom: prenom || null,
      ville: ville || null,
      pays: pays || null,
      date_naissance: date_naissance || null,
      telephone: telephone || null,
      commune: commune || null,
      adresse: adresse || null,
      bio: bio || null,
      photo: photoDataUrl || null,
    })
    .eq("id", studentId);

  // Attach user to student
  try {
    await attachStudentUserByEmail(student.email.toLowerCase(), data.user?.id || "");
  } catch (attachError) {
    await supabase.auth.signOut();
    await clearLoginModeCookie();
    const message = attachError instanceof Error ? attachError.message : "auth_failed";
    redirect(buildRedirect(nextPath, message));
  }

  redirect(nextPath);
}
