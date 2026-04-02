"use server";

import { redirect } from "next/navigation";

import { updateTeacherActivityNote } from "@/lib/utils/supabase/teacher-teaching";

const buildRedirectUrl = (activityId: string, status: "success" | "error", message?: string) => {
  const query = new URLSearchParams();
  query.set("status", status);

  if (message) {
    query.set("message", message);
  }

  return `/activity/${activityId}?${query.toString()}`;
};

export async function updateActivityCommandeAction(formData: FormData) {
  const activityIdField = formData.get("activity_id");
  const noteIdField = formData.get("note_id");
  const activityId = typeof activityIdField === "string" ? activityIdField : null;
  const noteId = typeof noteIdField === "string" ? noteIdField : null;

  if (!activityId || !noteId) {
    redirect("/");
  }

  const noteField = formData.get("note");
  const statusField = formData.get("status");
  const commentField = formData.get("comment");

  const rawNote = typeof noteField === "string" ? noteField.trim() : "";
  const rawStatus = typeof statusField === "string" ? statusField.trim() : "";
  const rawComment = typeof commentField === "string" ? commentField.trim() : "";

  const note = rawNote.length > 0 ? Number(rawNote.replace(",", ".")) : null;
  const status = rawStatus.length > 0 ? rawStatus : null;
  const comment = rawComment.length > 0 ? rawComment : null;

  if (rawNote.length > 0 && !Number.isFinite(note)) {
    redirect(buildRedirectUrl(activityId, "error", "note_invalid"));
  }

  try {
    await updateTeacherActivityNote(noteId, {
      note,
      status,
      comment,
    });

    redirect(buildRedirectUrl(activityId, "success", "commande_updated"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "commande_update_failed";
    redirect(buildRedirectUrl(activityId, "error", message));
  }
}
