"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import {
  clearLoginModeCookie,
  createAzureSignInUrl,
  getAuthCallbackUrl,
  getSafeNextPath,
  setLoginModeCookie,
  type LoginMode,
} from "@/lib/utils/supabase/auth";
import {
  assertAdminCanAuthenticate,
  assertTeacherCanAuthenticate,
  attachAdminUserByEmail,
  attachTeacherUserByEmail,
} from "@/lib/utils/supabase/agents";
import type { AgentRecord } from "@/lib/utils/supabase/agents-shared";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";
import { assertStudentCanAuthenticate, attachStudentUserByEmail } from "@/lib/utils/supabase/students";
import { syncAuthenticatedUser } from "@/lib/utils/supabase/session";
import type { StudentRecord } from "@/lib/utils/supabase/students-shared";

const getFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const buildAuthRedirectPath = (
  pathname: "/signin" | "/signup",
  nextPath: string,
  tab?: "student" | "teacher" | "admin",
  error?: string,
  message?: string,
) => {
  const searchParams = new URLSearchParams();

  if (nextPath && nextPath !== "/") {
    searchParams.set("next", nextPath);
  }

  if (tab) {
    searchParams.set("tab", tab);
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

const getTeacherAuthErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "auth_failed";
  }

  switch (error.message) {
    case "teacher_not_found":
      return "teacher_not_found";
    case "teacher_already_linked":
      return "teacher_already_linked";
    case "teacher_email_conflict":
      return "teacher_email_conflict";
    default:
      return error.message;
  }
};

const getAdminAuthErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "auth_failed";
  }

  switch (error.message) {
    case "admin_not_found":
      return "admin_not_found";
    case "admin_already_linked":
      return "admin_already_linked";
    case "admin_email_required":
      return "missing_credentials";
    default:
      return error.message;
  }
};

const signInWithPasswordAndSync = async ({
  email,
  password,
  loginMode,
  attachUser,
}: {
  email: string;
  password: string;
  loginMode: LoginMode;
  attachUser: (email: string, userId: string) => Promise<StudentRecord | AgentRecord>;
}) => {
  await setLoginModeCookie(loginMode);

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user?.email) {
    await supabase.auth.signOut();
    throw new Error("auth_failed");
  }

  try {
    await attachUser(userData.user.email, userData.user.id);
    await syncAuthenticatedUser();
  } catch (syncError) {
    await supabase.auth.signOut();
    throw syncError;
  }
};

export async function signInWithAzureAction(formData: FormData) {
  const nextPath = formData.get("next");
  await setLoginModeCookie("faculty_sso");
  const { authorizationUrl } = await createAzureSignInUrl(typeof nextPath === "string" ? nextPath : null);

  redirect(authorizationUrl);
}

export async function signInStudentAction(formData: FormData) {
  const nextPath = getSafeNextPath(getFormValue(formData, "next") || null);
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");

  if (!email || !password) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "student", "missing_credentials"));
  }

  try {
    await assertStudentCanAuthenticate(email);
  } catch (error) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "student", getStudentAuthErrorMessage(error)));
  }

  try {
    await signInWithPasswordAndSync({
      email,
      password,
      loginMode: "student_password",
      attachUser: attachStudentUserByEmail,
    });
  } catch (error) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "student", getStudentAuthErrorMessage(error)));
  }

  redirect(nextPath);
}

export async function signInTeacherAction(formData: FormData) {
  const nextPath = getSafeNextPath(getFormValue(formData, "next") || null);
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");

  if (!email || !password) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "teacher", "missing_credentials"));
  }

  try {
    await assertTeacherCanAuthenticate(email);
  } catch (error) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "teacher", getTeacherAuthErrorMessage(error)));
  }

  try {
    await signInWithPasswordAndSync({
      email,
      password,
      loginMode: "teacher_password",
      attachUser: attachTeacherUserByEmail,
    });
  } catch (error) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "teacher", getTeacherAuthErrorMessage(error)));
  }

  redirect(nextPath);
}

export async function signInAdminAction(formData: FormData) {
  const nextPath = getSafeNextPath(getFormValue(formData, "next") || null);
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");

  if (!email || !password) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "admin", "missing_credentials"));
  }

  try {
    await assertAdminCanAuthenticate(email);
  } catch (error) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "admin", getAdminAuthErrorMessage(error)));
  }

  try {
    await signInWithPasswordAndSync({
      email,
      password,
      loginMode: "admin_password",
      attachUser: attachAdminUserByEmail,
    });
  } catch (error) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "admin", getAdminAuthErrorMessage(error)));
  }

  redirect(nextPath);
}

export async function signUpStudentAction(formData: FormData) {
  const nextPath = getSafeNextPath(getFormValue(formData, "next") || null);
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");
  const confirmPassword = getFormValue(formData, "confirm_password");

  if (!email || !password || !confirmPassword) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "student", "missing_signup_fields"));
  }

  if (password.length < 6) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "student", "password_too_short"));
  }

  if (password !== confirmPassword) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "student", "password_mismatch"));
  }

  let student: StudentRecord;

  try {
    student = await assertStudentCanAuthenticate(email);
  } catch (error) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "student", getStudentAuthErrorMessage(error)));
  }

  if (student.user_id) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "student", "student_already_registered"));
  }

  await setLoginModeCookie("student_password");
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const confirmationPath = `/signin?message=${encodeURIComponent("student_email_confirmed")}&tab=student${
    nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : ""
  }`;
  const { callbackUrl } = await getAuthCallbackUrl(confirmationPath, "student_password");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "student", error.message));
  }

  if (data.session) {
    await syncAuthenticatedUser();
    redirect(nextPath);
  }

  redirect(buildAuthRedirectPath("/signin", nextPath, "student", undefined, "signup_confirmation_sent"));
}

export async function signUpTeacherAction(formData: FormData) {
  const nextPath = getSafeNextPath(getFormValue(formData, "next") || null);
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");
  const confirmPassword = getFormValue(formData, "confirm_password");

  if (!email || !password || !confirmPassword) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "teacher", "missing_signup_fields"));
  }

  if (password.length < 6) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "teacher", "password_too_short"));
  }

  if (password !== confirmPassword) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "teacher", "password_mismatch"));
  }

  let teacher: AgentRecord;

  try {
    teacher = await assertTeacherCanAuthenticate(email);
  } catch (error) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "teacher", getTeacherAuthErrorMessage(error)));
  }

  if (teacher.user_id) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "teacher", "teacher_already_registered"));
  }

  await setLoginModeCookie("teacher_password");
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const confirmationPath = `/signin?message=${encodeURIComponent("teacher_email_confirmed")}&tab=teacher${
    nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : ""
  }`;
  const { callbackUrl } = await getAuthCallbackUrl(confirmationPath, "teacher_password");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "teacher", error.message));
  }

  if (data.session) {
    await syncAuthenticatedUser();
    redirect(nextPath);
  }

  redirect(buildAuthRedirectPath("/signin", nextPath, "teacher", undefined, "signup_confirmation_sent"));
}

export async function signUpAdminAction(formData: FormData) {
  const nextPath = getSafeNextPath(getFormValue(formData, "next") || null);
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");
  const confirmPassword = getFormValue(formData, "confirm_password");

  if (!email || !password || !confirmPassword) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "admin", "missing_signup_fields"));
  }

  if (password.length < 6) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "admin", "password_too_short"));
  }

  if (password !== confirmPassword) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "admin", "password_mismatch"));
  }

  let adminAgent: AgentRecord;

  try {
    adminAgent = await assertAdminCanAuthenticate(email);
  } catch (error) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "admin", getAdminAuthErrorMessage(error)));
  }

  if (adminAgent.user_id) {
    redirect(buildAuthRedirectPath("/signin", nextPath, "admin", "admin_already_registered"));
  }

  await setLoginModeCookie("admin_password");
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const confirmationPath = `/signin?message=${encodeURIComponent("admin_email_confirmed")}&tab=admin${
    nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : ""
  }`;
  const { callbackUrl } = await getAuthCallbackUrl(confirmationPath, "admin_password");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    redirect(buildAuthRedirectPath("/signup", nextPath, "admin", error.message));
  }

  if (data.session) {
    await syncAuthenticatedUser();
    redirect(nextPath);
  }

  redirect(buildAuthRedirectPath("/signin", nextPath, "admin", undefined, "signup_confirmation_sent"));
}

export async function signOutAction() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  await supabase.auth.signOut();
  await clearLoginModeCookie();
  redirect("/signin");
}
