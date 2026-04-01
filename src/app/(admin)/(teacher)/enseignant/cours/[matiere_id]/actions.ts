"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { updateTeacherCourseDescriptor, updateTeacherCoursePlan } from "@/lib/utils/supabase/teacher-teaching";

const buildRedirectUrl = (formData: FormData, status: "success" | "error", tab: "descriptor" | "plan", message?: string) => {
  const matiereId = formData.get("matiere_id");
  const query = new URLSearchParams();

  query.set("tab", tab);
  query.set("status", status);

  if (message) {
    query.set("message", message);
  }

  if (typeof matiereId !== "string" || matiereId.length === 0) {
    return `/`;
  }

  return `/enseignant/cours/${matiereId}?${query.toString()}`;
};

export async function saveTeacherCourseDescriptorAction(formData: FormData) {
  try {
    await updateTeacherCourseDescriptor(formData);
    redirect(buildRedirectUrl(formData, "success", "descriptor"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "teacher_course_descriptor_save_failed";
    redirect(buildRedirectUrl(formData, "error", "descriptor", message));
  }
}

export async function saveTeacherCoursePlanAction(formData: FormData) {
  try {
    await updateTeacherCoursePlan(formData);
    redirect(buildRedirectUrl(formData, "success", "plan"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "teacher_course_plan_save_failed";
    redirect(buildRedirectUrl(formData, "error", "plan", message));
  }
}
