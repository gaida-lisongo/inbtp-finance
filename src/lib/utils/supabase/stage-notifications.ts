import { DocumentStage } from "@/lib/documents";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getProductPageData, getCommandeStudentDisplayName } from "@/lib/utils/supabase/commandes";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

type StageRecipientSex = "M" | "F";
type DeliveredStatus = "pending" | "success" | "no";

type StageNotificationRow = {
  id: number;
  created_at: string;
  stageTitle: string | null;
  recipientName: string | null;
  recipientQuality: string | null;
  recipientSex: string | null;
  companyName: string | null;
  companyLocation: string | null;
  documentReference: string | null;
  notification_id: string | null;
  delivered: string | null;
};

type NotificationRow = {
  id: string;
  created_at: string;
  student_id: string;
  object: string | null;
  description: string | null;
  categorie: string;
  is_read: boolean;
  path: string | null;
  status: boolean | null;
};

type StudentRow = {
  id: string;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
};

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const sanitizeDelivered = (value: string | null | undefined): DeliveredStatus => {
  const normalized = normalizeText(value)?.toLowerCase();

  if (normalized === "success" || normalized === "no") {
    return normalized;
  }

  return "pending";
};

const assertOrganizerAccess = async () => {
  const user = await getAuthenticatedUser();

  if (!user || user.activePersona !== "admin" || !user.agentId) {
    throw new Error("access_denied");
  }

  const codes = await getActiveAutorisationCodesForAgent(user.agentId);

  if (!codes.includes("CS")) {
    throw new Error("access_denied");
  }
};

export const createStageLetterRequestNotification = async (input: {
  productId: string;
  recipientName: string;
  recipientQuality: string;
  recipientSex: StageRecipientSex;
  companyName: string;
  companyLocation: string;
}) => {
  const productData = await getProductPageData("stages", input.productId);

  if (!productData.hasPaidAccess || !productData.existingSuccessCommande) {
    throw new Error("stage_commande_not_paid");
  }

  const admin = createAdminClient();
  const reference = productData.existingSuccessCommande.orderNumber ?? productData.existingSuccessCommande.id;
  const { data: notificationData, error: notificationError } = await admin
    .from("notifications")
    .insert({
      student_id: productData.student.id,
      object: `Demande lettre de stage ${reference}`,
      description: `Demande de lettre pour ${productData.resource.title} (${input.companyName} - ${input.companyLocation}).`,
      categorie: "stages",
      path: "/notifications/stages",
      status: false,
      is_read: false,
    })
    .select("id")
    .single();

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  const notificationId = (notificationData as { id: string }).id;
  const { data: stageNotificationData, error: stageNotificationError } = await admin
    .from("notifications_stage")
    .insert({
      stageTitle: productData.resource.title,
      recipientName: input.recipientName,
      recipientQuality: input.recipientQuality,
      recipientSex: input.recipientSex,
      companyName: input.companyName,
      companyLocation: input.companyLocation,
      documentReference: reference,
      notification_id: notificationId,
      delivered: "pending",
    })
    .select("id")
    .single();

  if (stageNotificationError) {
    throw new Error(stageNotificationError.message);
  }

  const stageNotificationId = (stageNotificationData as { id: number }).id;
  const { error: updateNotificationPathError } = await admin
    .from("notifications")
    .update({ path: `/notifications/stages/${stageNotificationId}` })
    .eq("id", notificationId);

  if (updateNotificationPathError) {
    throw new Error(updateNotificationPathError.message);
  }

  return {
    notificationId,
    orderReference: reference,
  };
};

export type StageRequestNotificationItem = {
  id: number;
  createdAt: string;
  delivered: DeliveredStatus;
  stageTitle: string;
  recipientName: string;
  recipientQuality: string;
  recipientSex: StageRecipientSex;
  companyName: string;
  companyLocation: string;
  documentReference: string | null;
  notificationId: string;
  student: {
    id: string;
    displayName: string;
    email: string | null;
    telephone: string | null;
  } | null;
};

export const getStageRequestNotifications = async (): Promise<StageRequestNotificationItem[]> => {
  await assertOrganizerAccess();
  const admin = createAdminClient();
  const { data: stageRowsData, error: stageRowsError } = await admin
    .from("notifications_stage")
    .select('id, created_at, "stageTitle", "recipientName", "recipientQuality", "recipientSex", "companyName", "companyLocation", "documentReference", notification_id, delivered')
    .order("created_at", { ascending: false });

  if (stageRowsError) {
    throw new Error(stageRowsError.message);
  }

  const stageRows = (stageRowsData ?? []) as StageNotificationRow[];
  const notificationIds = Array.from(
    new Set(stageRows.map((row) => row.notification_id).filter((value): value is string => typeof value === "string" && value.length > 0)),
  );

  if (notificationIds.length === 0) {
    return [];
  }

  const { data: notificationRowsData, error: notificationRowsError } = await admin
    .from("notifications")
    .select("id, created_at, student_id, object, description, categorie, is_read, path, status")
    .in("id", notificationIds)
    .eq("categorie", "stages");

  if (notificationRowsError) {
    throw new Error(notificationRowsError.message);
  }

  const notificationRows = (notificationRowsData ?? []) as NotificationRow[];
  const notificationsById = new Map(notificationRows.map((row) => [row.id, row] as const));
  const studentIds = Array.from(new Set(notificationRows.map((row) => row.student_id)));

  const { data: studentsData, error: studentsError } = studentIds.length
    ? await admin.from("students").select("id, nom, post_nom, prenom, email, telephone").in("id", studentIds)
    : { data: [], error: null };

  if (studentsError) {
    throw new Error(studentsError.message);
  }

  const studentsById = new Map(((studentsData ?? []) as StudentRow[]).map((student) => [student.id, student] as const));

  return stageRows.flatMap((row) => {
    if (!row.notification_id) {
      return [];
    }

    const notification = notificationsById.get(row.notification_id);

    if (!notification) {
      return [];
    }

    const student = studentsById.get(notification.student_id) ?? null;
    const displayName = student ? [student.prenom, student.post_nom, student.nom].filter(Boolean).join(" ").trim() || "Etudiant" : "Etudiant";
    const recipientSex = normalizeText(row.recipientSex) === "F" ? "F" : "M";

    return [
      {
        id: row.id,
        createdAt: row.created_at,
        delivered: sanitizeDelivered(row.delivered),
        stageTitle: normalizeText(row.stageTitle) ?? "Stage academique",
        recipientName: normalizeText(row.recipientName) ?? "A qui de droit",
        recipientQuality: normalizeText(row.recipientQuality) ?? "Responsable",
        recipientSex,
        companyName: normalizeText(row.companyName) ?? "Entreprise non renseignee",
        companyLocation: normalizeText(row.companyLocation) ?? "Lieu non renseigne",
        documentReference: normalizeText(row.documentReference),
        notificationId: notification.id,
        student: student
          ? {
              id: student.id,
              displayName,
              email: student.email,
              telephone: student.telephone,
            }
          : null,
      } satisfies StageRequestNotificationItem,
    ];
  });
};

export const getStageRequestNotificationById = async (notificationStageId: number): Promise<StageRequestNotificationItem | null> => {
  const items = await getStageRequestNotifications();
  return items.find((item) => item.id === notificationStageId) ?? null;
};

export const generateStageLetterFromNotification = async (notificationStageId: number) => {
  await assertOrganizerAccess();
  const admin = createAdminClient();
  const { data: stageData, error: stageError } = await admin
    .from("notifications_stage")
    .select('id, created_at, "stageTitle", "recipientName", "recipientQuality", "recipientSex", "companyName", "companyLocation", "documentReference", notification_id, delivered')
    .eq("id", notificationStageId)
    .maybeSingle();

  if (stageError) {
    throw new Error(stageError.message);
  }

  if (!stageData) {
    throw new Error("stage_notification_not_found");
  }

  const stageRow = stageData as StageNotificationRow;

  if (!stageRow.notification_id) {
    throw new Error("stage_notification_parent_missing");
  }

  const { data: notificationData, error: notificationError } = await admin
    .from("notifications")
    .select("id, student_id")
    .eq("id", stageRow.notification_id)
    .maybeSingle();

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  if (!notificationData) {
    throw new Error("stage_notification_parent_missing");
  }

  const parent = notificationData as { id: string; student_id: string };
  const { data: studentData, error: studentError } = await admin
    .from("students")
    .select("id, nom, post_nom, prenom, email, telephone")
    .eq("id", parent.student_id)
    .maybeSingle();

  if (studentError) {
    throw new Error(studentError.message);
  }

  if (!studentData) {
    throw new Error("student_not_found");
  }

  const student = studentData as StudentRow;
  const studentName = getCommandeStudentDisplayName(student);
  const recipientSex: StageRecipientSex = normalizeText(stageRow.recipientSex) === "F" ? "F" : "M";

  const document = new DocumentStage({
    stageTitle: normalizeText(stageRow.stageTitle) ?? "Stage academique",
    student: {
      fullName: studentName,
      email: student.email,
      telephone: student.telephone,
    },
    recipientName: normalizeText(stageRow.recipientName) ?? "A qui de droit",
    recipientQuality: normalizeText(stageRow.recipientQuality) ?? "Responsable",
    recipientSex,
    companyName: normalizeText(stageRow.companyName) ?? "Entreprise",
    companyLocation: normalizeText(stageRow.companyLocation) ?? "Lieu",
    documentReference: normalizeText(stageRow.documentReference) ?? parent.id,
  });

  const pdfBuffer = await document.generateBuffer();

  const { error: stageUpdateError } = await admin
    .from("notifications_stage")
    .update({ delivered: "success" })
    .eq("id", stageRow.id);

  if (stageUpdateError) {
    throw new Error(stageUpdateError.message);
  }

  const { error: parentNotificationUpdateError } = await admin
    .from("notifications")
    .update({ status: true, is_read: true })
    .eq("id", parent.id);

  if (parentNotificationUpdateError) {
    throw new Error(parentNotificationUpdateError.message);
  }

  const { error: studentNotificationError } = await admin.from("notifications").insert({
    student_id: student.id,
    object: "Lettre de stage disponible",
    description: "Votre lettre de stage est prete. Rendez-vous a l'administration pour la recuperer.",
    categorie: "stages_student",
    path: "/ressources",
    status: false,
    is_read: false,
  });

  if (studentNotificationError) {
    console.error("student stage notification insert failed", studentNotificationError);
  }

  return {
    filename: `lettre-stage-notification-${stageRow.id}.pdf`,
    buffer: pdfBuffer,
  };
};
