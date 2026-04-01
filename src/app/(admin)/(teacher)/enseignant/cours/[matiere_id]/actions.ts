"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { createAdminClient } from "@/lib/utils/supabase/admin";
import {
  createTeacherActivity,
  ensureTeacherActivityAccess,
  updateTeacherActivityQuestions,
  updateTeacherCourseDescriptor,
  updateTeacherCoursePlan,
} from "@/lib/utils/supabase/teacher-teaching";

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

const buildActivityRedirectUrl = (formData: FormData, status: "success" | "error", tab: "qcm" | "tp", message?: string) =>
  buildRedirectUrl(formData, status, tab, message);

export async function createTeacherActivityAction(formData: FormData) {
  const category = typeof formData.get("categorie") === "string" ? formData.get("categorie") : "qcm";
  const tab = category === "tp" ? "tp" : "qcm";

  const rawMontant = typeof formData.get("montant") === "string" ? formData.get("montant") : "";
  const rawNote = typeof formData.get("note") === "string" ? formData.get("note") : "";
  const designation = typeof formData.get("designation") === "string" ? formData.get("designation").trim() : "";
  const description = typeof formData.get("description") === "string" ? formData.get("description").trim() : null;
  const dateLimite = typeof formData.get("date_limite") === "string" && formData.get("date_limite") ? formData.get("date_limite") : null;
  const coursId = typeof formData.get("course_id") === "string" ? formData.get("course_id") : null;

  if (!coursId || !designation) {
    redirect(buildActivityRedirectUrl(formData, "error", tab, "activity_creation_failed"));
  }

  try {
    await createTeacherActivity({
      coursId,
      designation,
      description,
      categorie: tab,
      montant: rawMontant ? Number(rawMontant) : null,
      note: rawNote ? Number(rawNote) : null,
      date_limite: dateLimite,
    });
    redirect(buildActivityRedirectUrl(formData, "success", tab, "activity_created"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "activity_creation_failed";
    redirect(buildActivityRedirectUrl(formData, "error", tab, message));
  }
}

export async function saveTeacherActivityQuestionsAction(formData: FormData) {
  const activityId = typeof formData.get("activity_id") === "string" ? formData.get("activity_id") : null;
  const questions = typeof formData.get("questions") === "string" ? formData.get("questions") : null;
  const tab = typeof formData.get("tab") === "string" && formData.get("tab") === "tp" ? "tp" : "qcm";

  if (!activityId) {
    redirect(buildActivityRedirectUrl(formData, "error", tab, "activity_required"));
  }

  try {
    await updateTeacherActivityQuestions(activityId!, questions);
    redirect(buildActivityRedirectUrl(formData, "success", tab, "questions_updated"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "activity_questions_update_failed";
    redirect(buildActivityRedirectUrl(formData, "error", tab, message));
  }
}

export async function exportActivityNotesAction(formData: FormData) {
  const activityId = typeof formData.get("activity_id") === "string" ? formData.get("activity_id") : null;

  if (!activityId) {
    throw new Error("activity_required");
  }

  await ensureTeacherActivityAccess(activityId);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cmd_activity")
    .select("created_at, status, note, comment, student:students(nom, post_nom, prenom, email)")
    .eq("activity_id", activityId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []).map((note) => {
    const student = note.student as Record<string, string | null> | null;
    const studentName = student
      ? [student.nom, student.post_nom, student.prenom].filter((value) => value && value.length > 0).join(" ")
      : "Étudiant";
    const email = typeof student?.email === "string" ? student.email : "";
    const status = typeof note.status === "string" ? note.status : "";
    const noteValue = typeof note.note === "number" ? note.note.toString() : "";
    const comment = typeof note.comment === "string" ? note.comment : "";

    return [studentName, email, status, noteValue, comment];
  });

  const header = ["Étudiant", "Email", "Statut", "Note", "Commentaire"];
  const csv = [header, ...rows]
    .map((row) => row.map((entry) => `"${String(entry ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="notes-${activityId}.csv"`,
    },
  });
}
