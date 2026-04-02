"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { createAdminClient } from "@/lib/utils/supabase/admin";
import {
  createTeacherActivity,
  exportTeacherCourseCotationTemplateCsv,
  ensureTeacherActivityAccess,
  importTeacherCourseCotationFromCsv,
  saveTeacherCourseCotationRows,
  updateTeacherActivityQuestions,
  updateTeacherCourseDescriptor,
  updateTeacherCoursePlan,
} from "@/lib/utils/supabase/teacher-teaching";

const buildRedirectUrl = (
  formData: FormData,
  status: "success" | "error",
  tab: "descriptor" | "plan" | "qcm" | "tp" | "cotation",
  message?: string,
) => {
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

const buildCotationRedirectUrl = (formData: FormData, status: "success" | "error", message?: string) =>
  buildRedirectUrl(formData, status, "cotation", message);

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

export async function saveTeacherCourseCotationAction(formData: FormData) {
  const matiereId = typeof formData.get("matiere_id") === "string" ? formData.get("matiere_id") : null;
  const rawRows = typeof formData.get("rows") === "string" ? formData.get("rows") : "[]";

  if (!matiereId) {
    redirect(buildCotationRedirectUrl(formData, "error", "matiere_required"));
  }

  let rows: Array<{
    studentId?: string;
    cc?: number | null;
    examen?: number | null;
    rattrapage?: number | null;
    rachat?: number | null;
  }> = [];

  try {
    const parsed = JSON.parse(rawRows);
    rows = Array.isArray(parsed) ? parsed : [];
  } catch {
    redirect(buildCotationRedirectUrl(formData, "error", "invalid_cotation_rows"));
  }

  try {
    await saveTeacherCourseCotationRows(
      matiereId!,
      rows.map((row) => ({
        studentId: typeof row.studentId === "string" ? row.studentId : "",
        cc: typeof row.cc === "number" ? row.cc : null,
        examen: typeof row.examen === "number" ? row.examen : null,
        rattrapage: typeof row.rattrapage === "number" ? row.rattrapage : null,
        rachat: typeof row.rachat === "number" ? row.rachat : null,
      })),
    );
    redirect(buildCotationRedirectUrl(formData, "success", "cotation_saved"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "cotation_save_failed";
    redirect(buildCotationRedirectUrl(formData, "error", message));
  }
}

export async function exportTeacherCourseCotationTemplateAction(formData: FormData) {
  const matiereId = typeof formData.get("matiere_id") === "string" ? formData.get("matiere_id") : null;

  if (!matiereId) {
    throw new Error("matiere_required");
  }

  const csv = await exportTeacherCourseCotationTemplateCsv(matiereId);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="cotation-template-${matiereId}.csv"`,
    },
  });
}

export async function importTeacherCourseCotationCsvAction(formData: FormData) {
  const matiereId = typeof formData.get("matiere_id") === "string" ? formData.get("matiere_id") : null;
  const csvContent = typeof formData.get("csv_content") === "string" ? formData.get("csv_content") : "";

  if (!matiereId) {
    redirect(buildCotationRedirectUrl(formData, "error", "matiere_required"));
  }

  try {
    await importTeacherCourseCotationFromCsv(matiereId!, csvContent);
    redirect(buildCotationRedirectUrl(formData, "success", "cotation_csv_imported"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "cotation_csv_import_failed";
    redirect(buildCotationRedirectUrl(formData, "error", message));
  }
}
