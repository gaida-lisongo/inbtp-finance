import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/utils/supabase/admin";
import { ensureTeacherActivityAccess } from "@/lib/utils/supabase/teacher-teaching";

export async function GET(_request: Request, context: { params: Promise<{ activityId: string }> }) {
  try {
    const { activityId } = await context.params;

    if (!activityId || typeof activityId !== "string") {
      return new NextResponse("activity_required", { status: 400 });
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

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="notes-${activityId}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "activity_notes_export_failed";
    return new NextResponse(message, { status: 500 });
  }
}

