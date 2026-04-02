import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getStudentDisplayName, type StudentRecord } from "@/lib/utils/supabase/students-shared";
import { getTeacherAssignedCourses } from "@/lib/utils/supabase/teacher-teaching";

type TeacherNotificationBaseRecord = {
  id: string;
  created_at: string;
  student_id: string | null;
  object: string | null;
  description: string | null;
  categorie: string | null;
  status: boolean | null;
  path: string | null;
};

type TeacherNotificationMatiereRecord = {
  id: string;
  created_at: string;
  matiere_id: string | null;
  notification_id: string | null;
  observation: string | null;
  status: boolean | null;
};

export type TeacherRecoursNotificationItem = {
  id: string;
  createdAt: string;
  notificationId: string | null;
  object: string | null;
  description: string | null;
  category: string | null;
  path: string | null;
  notificationStatus: boolean | null;
  recoursStatus: boolean | null;
  observation: string | null;
  student: {
    id: string;
    displayName: string;
    email: string | null;
  } | null;
  matiere: {
    id: string;
    designation: string | null;
  } | null;
  programme: {
    id: string;
    designation: string | null;
  } | null;
};

export type TeacherRecoursNotificationSnapshot = {
  items: TeacherRecoursNotificationItem[];
  pendingCount: number;
  resolvedCount: number;
  totalCount: number;
};

const getTeacherAgentId = async (agentId?: string) => {
  if (agentId) {
    return agentId;
  }

  const user = await getAuthenticatedUser();

  if (!user || user.activePersona !== "teacher" || !user.agentId) {
    throw new Error("teacher_access_denied");
  }

  return user.agentId;
};

const uniqueValues = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)));

export const getTeacherRecoursNotificationSnapshot = async (agentId?: string): Promise<TeacherRecoursNotificationSnapshot> => {
  const teacherAgentId = await getTeacherAgentId(agentId);
  const assignments = await getTeacherAssignedCourses(teacherAgentId);
  const matiereIds = uniqueValues(assignments.map((assignment) => assignment.matiere.id));

  if (matiereIds.length === 0) {
    return {
      items: [],
      pendingCount: 0,
      resolvedCount: 0,
      totalCount: 0,
    };
  }

  const assignmentByMatiereId = new Map(
    assignments.map((assignment) => [
      assignment.matiere.id,
      {
        matiere: {
          id: assignment.matiere.id,
          designation: assignment.matiere.designation,
        },
        programme: assignment.programme
          ? {
              id: assignment.programme.id,
              designation: assignment.programme.designation,
            }
          : null,
      },
    ] as const),
  );

  const admin = createAdminClient();
  const { data: rawRecoursRows, error: recoursError } = await admin
    .from("notifications_matiere")
    .select("id, created_at, matiere_id, notification_id, observation, status")
    .in("matiere_id", matiereIds)
    .order("created_at", { ascending: false });

  if (recoursError) {
    throw new Error(recoursError.message);
  }

  const recoursRows = (rawRecoursRows ?? []) as TeacherNotificationMatiereRecord[];
  const notificationIds = uniqueValues(recoursRows.map((row) => row.notification_id));

  if (notificationIds.length === 0) {
    return {
      items: [],
      pendingCount: 0,
      resolvedCount: 0,
      totalCount: 0,
    };
  }

  const { data: rawNotificationRows, error: notificationError } = await admin
    .from("notifications")
    .select("id, created_at, student_id, object, description, categorie, status, path")
    .in("id", notificationIds);

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  const notificationRows = (rawNotificationRows ?? []) as TeacherNotificationBaseRecord[];
  const notificationsById = new Map(notificationRows.map((row) => [row.id, row] as const));
  const studentIds = uniqueValues(notificationRows.map((row) => row.student_id));

  const { data: rawStudentRows, error: studentError } = studentIds.length
    ? await admin.from("students").select("id, nom, post_nom, prenom, email").in("id", studentIds)
    : { data: [], error: null };

  if (studentError) {
    throw new Error(studentError.message);
  }

  const studentsById = new Map(
    ((rawStudentRows ?? []) as Array<Pick<StudentRecord, "id" | "nom" | "post_nom" | "prenom" | "email">>).map((student) => [
      student.id,
      student,
    ] as const),
  );

  const items = recoursRows.flatMap((row) => {
    if (!row.notification_id || !row.matiere_id) {
      return [];
    }

    const notification = notificationsById.get(row.notification_id);
    const assignment = assignmentByMatiereId.get(row.matiere_id);

    if (!notification || !assignment) {
      return [];
    }

    const student = notification.student_id ? studentsById.get(notification.student_id) ?? null : null;

    return [
      {
        id: row.id,
        createdAt: row.created_at,
        notificationId: notification.id,
        object: notification.object,
        description: notification.description,
        category: notification.categorie,
        path: notification.path,
        notificationStatus: notification.status,
        recoursStatus: row.status,
        observation: row.observation,
        student: student
          ? {
              id: student.id,
              displayName: getStudentDisplayName(student),
              email: student.email,
            }
          : null,
        matiere: assignment.matiere,
        programme: assignment.programme,
      } satisfies TeacherRecoursNotificationItem,
    ];
  });

  const pendingCount = items.filter((item) => item.recoursStatus !== true).length;
  const resolvedCount = items.length - pendingCount;

  return {
    items,
    pendingCount,
    resolvedCount,
    totalCount: items.length,
  };
};
