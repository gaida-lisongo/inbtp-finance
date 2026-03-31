"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createAzureSignInUrl, getAuthCallbackUrl, getSafeNextPath } from "@/lib/utils/supabase/auth";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";
import { assertStudentCanAuthenticate, attachStudentUserByEmail } from "@/lib/utils/supabase/students";
import { syncAuthenticatedUser } from "@/lib/utils/supabase/session";
import type { StudentRecord } from "@/lib/utils/supabase/students-shared";

const getFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const buildAuthRedirectPath = (pathname: "/signin" | "/signup", nextPath: string, error?: string, message?: string) => {
  const searchParams = new URLSearchParams();

  if (nextPath && nextPath !== "/") {
    searchParams.set("next", nextPath);
  }

  if (error) {
    searchParams.set("error", error);
  }

  if (message) {
    searchParams.set("message", message);
  }

  const query = searchParams.toString();
  return query.length > 0 ? `${pathname}?${query}` : pathname;
};

const getStudentAuthErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "auth_failed";
  }

  switch (error.message) {
    case "student_not_found":
      return "student_not_found";
    case "student_already_linked":
      return "student_already_linked";
    case "student_email_conflict":
      return "student_email_conflict";
    default:
      return error.message;
  }
};

export async function signInWithAzureAction(formData: FormData) {
  const nextPath = formData.get("next");
  const { authorizationUrl } = await createAzureSignInUrl(
    typeof nextPath === "string" ? nextPath : null,
  );

  redirect(authorizationUrl);
}

export async function signInStudentAction(formData: FormData) {
  const nextPath = getSafeNextPath(getFormValue(formData, "next") || null);
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");

  if (!email || !password) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "missing_credentials"));
  }

  try {
    await assertStudentCanAuthenticate(email);
  } catch (error) {
    redirect(buildAuthRedirectPath("/signin", nextPath, getStudentAuthErrorMessage(error)));
  }

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(buildAuthRedirectPath("/signin", nextPath, error.message));
  }

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user?.email) {
    await supabase.auth.signOut();
    redirect(buildAuthRedirectPath("/signin", nextPath, "auth_failed"));
  }

  try {
    await attachStudentUserByEmail(userData.user.email, userData.user.id);
    await syncAuthenticatedUser();
  } catch (syncError) {
    await supabase.auth.signOut();
    redirect(buildAuthRedirectPath("/signin", nextPath, getStudentAuthErrorMessage(syncError)));
  }

  redirect(nextPath);
}

export async function signUpStudentAction(formData: FormData) {
  const nextPath = getSafeNextPath(getFormValue(formData, "next") || null);
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");
  const confirmPassword = getFormValue(formData, "confirm_password");

  if (!email || !password || !confirmPassword) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "missing_signup_fields"));
  }

  if (password.length < 6) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "password_too_short"));
  }

  if (password !== confirmPassword) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "password_mismatch"));
  }

  let student: StudentRecord;

  try {
    student = await assertStudentCanAuthenticate(email);
  } catch (error) {
    redirect(buildAuthRedirectPath("/signup", nextPath, getStudentAuthErrorMessage(error)));
  }

  if (student.user_id) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "student_already_registered"));
  }

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const confirmationPath = `/signin?message=${encodeURIComponent("student_email_confirmed")}${nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : ""}`;
  const { callbackUrl } = await getAuthCallbackUrl(confirmationPath);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    redirect(buildAuthRedirectPath("/signup", nextPath, error.message));
  }

  if (data.session) {
    await syncAuthenticatedUser();
    redirect(nextPath);
  }

  redirect(buildAuthRedirectPath("/signin", nextPath, undefined, "signup_confirmation_sent"));
}

export async function signOutAction() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  await supabase.auth.signOut();
  redirect("/signin");
}
