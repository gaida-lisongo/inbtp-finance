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
  const categoryValue = formData.get("categorie");
  const category = typeof categoryValue === "string" ? categoryValue : "qcm";
  const tab = category === "tp" ? "tp" : "qcm";

  const montantValue = formData.get("montant");
  const noteValue = formData.get("note");
  const designationValue = formData.get("designation");
  const descriptionValue = formData.get("description");
  const dateLimiteValue = formData.get("date_limite");
  const courseIdValue = formData.get("course_id");
  const rawMontant = typeof montantValue === "string" ? montantValue : "";
  const rawNote = typeof noteValue === "string" ? noteValue : "";
  const designation = typeof designationValue === "string" ? designationValue.trim() : "";
  const description = typeof descriptionValue === "string" ? descriptionValue.trim() : null;
  const dateLimite = typeof dateLimiteValue === "string" && dateLimiteValue ? dateLimiteValue : null;
  const coursId = typeof courseIdValue === "string" ? courseIdValue : null;

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
  const activityIdValue = formData.get("activity_id");
  const questionsValue = formData.get("questions");
  const tabValue = formData.get("tab");
  const activityId = typeof activityIdValue === "string" ? activityIdValue : null;
  const questions = typeof questionsValue === "string" ? questionsValue : null;
  const tab = typeof tabValue === "string" && tabValue === "tp" ? "tp" : "qcm";

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
  const activityIdValue = formData.get("activity_id");
  const activityId = typeof activityIdValue === "string" ? activityIdValue : null;

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
    const studentSource = Array.isArray(note.student) ? note.student[0] : note.student;
    const student =
      studentSource && typeof studentSource === "object"
        ? (studentSource as { nom?: string | null; post_nom?: string | null; prenom?: string | null; email?: string | null })
        : null;
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
  const matiereIdValue = formData.get("matiere_id");
  const rowsValue = formData.get("rows");
  const matiereId = typeof matiereIdValue === "string" ? matiereIdValue : null;
  const rawRows = typeof rowsValue === "string" ? rowsValue : "[]";

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
  const matiereIdValue = formData.get("matiere_id");
  const matiereId = typeof matiereIdValue === "string" ? matiereIdValue : null;

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
  const matiereIdValue = formData.get("matiere_id");
  const csvContentValue = formData.get("csv_content");
  const matiereId = typeof matiereIdValue === "string" ? matiereIdValue : null;
  const csvContent = typeof csvContentValue === "string" ? csvContentValue : "";

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
