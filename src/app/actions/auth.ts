"use server";

import { redirect } from "next/navigation";

import { getSafeNextPath } from "@/lib/utils/supabase/auth";

const getFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const buildSignInUrl = (tab: "student" | "teacher" | "admin", nextPath: string, message?: string) => {
  const search = new URLSearchParams();
  search.set("tab", tab);
  if (nextPath && nextPath !== "/") search.set("next", nextPath);
  if (message) search.set("message", message);
  return `/signin?${search.toString()}`;
};

export async function signUpStudentAction(formData: FormData) {
  const nextPath = getSafeNextPath(getFormValue(formData, "next") || null);
  redirect(`/signup?tab=student${nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : ""}&error=use_student_wizard`);
}

export async function signUpTeacherAction(formData: FormData) {
  const nextPath = getSafeNextPath(getFormValue(formData, "next") || null);
  redirect(buildSignInUrl("teacher", nextPath, "signup_disabled_use_otp"));
}

export async function signUpAdminAction(formData: FormData) {
  const nextPath = getSafeNextPath(getFormValue(formData, "next") || null);
  redirect(buildSignInUrl("admin", nextPath, "signup_disabled_use_otp"));
}

