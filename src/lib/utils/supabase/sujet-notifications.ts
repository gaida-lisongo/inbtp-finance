import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getCurrentAuthenticatedStudent, getProductPageData, getCommandeStudentDisplayName } from "@/lib/utils/supabase/commandes";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import PdfDocumentSujet from "@/utils/pdf/DocumentSujet";

type SubjectSection = {
  section: string;
  content: string;
};

type SubjectNotificationRow = {
  id: string;
  created_at: string;
  notification_id: string | null;
  titre: string | null;
  directeur: string | null;
  co_directeur: string | null;
  thematique: unknown;
  justification: unknown;
  problematique: unknown;
  objectif: unknown;
  methodologie: unknown;
  resultats_attendus: unknown;
  chronogrammes: unknown;
  references: unknown;
  note: number | null;
  validation: boolean | null;
  observations: unknown;
};

type NotificationRow = {
  id: string;
  created_at?: string;
  object?: string | null;
  student_id: string;
  categorie: string;
  status: boolean | null;
  is_read: boolean;
};

type StudentRow = {
  id: string;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
};

type SujetJuryMember = {
  membre: string;
  enseignant: string;
};

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\r\n/g, "\n").trim();
  return normalized.length > 0 ? normalized : null;
};

const sanitizeStringSections = (value: string[]) => {
  return value
    .map((item) => normalizeText(item))
    .filter((item): item is string => typeof item === "string");
};

const sanitizeStructuredSections = (value: SubjectSection[]) => {
  return value
    .map((item) => ({
      section: normalizeText(item.section),
      content: normalizeText(item.content),
    }))
    .filter((item): item is { section: string; content: string } => Boolean(item.section && item.content));
};

const parseStringSections = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? normalizeText(item) : null))
    .filter((item): item is string => Boolean(item));
};

const parseStructuredSections = (value: unknown): SubjectSection[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const section = typeof record.section === "string" ? normalizeText(record.section) : null;
      const content = typeof record.content === "string" ? normalizeText(record.content) : null;

      if (!section || !content) {
        return null;
      }

      return { section, content };
    })
    .filter((item): item is SubjectSection => Boolean(item));
};

const parseObservationLines = (value: unknown): string[] => {
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => normalizeText(item))
      .filter((item): item is string => Boolean(item));
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      if (typeof item === "string") {
        return item.split("\n");
      }

      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        if (typeof record.content === "string") {
          return record.content.split("\n");
        }
      }

      return [];
    })
    .map((item) => normalizeText(item))
    .filter((item): item is string => Boolean(item));
};

const parseSujetJury = (value: unknown): SujetJuryMember[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const membre = typeof record.membre === "string" ? normalizeText(record.membre) : null;
      const enseignant = typeof record.enseignant === "string" ? normalizeText(record.enseignant) : null;

      if (!membre || !enseignant) {
        return null;
      }

      return { membre, enseignant };
    })
    .filter((item): item is SujetJuryMember => item !== null);
};

const extractOrderReferenceFromObject = (value: string | null | undefined) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const chunks = normalized.split(/\s+/).filter(Boolean);
  return chunks.length > 0 ? chunks[chunks.length - 1] ?? null : null;
};

const findSujetJuryByNotificationReference = async (input: {
  studentId: string;
  notificationObject: string | null | undefined;
}) => {
  const reference = extractOrderReferenceFromObject(input.notificationObject);

  if (!reference) {
    return [] as SujetJuryMember[];
  }

  const admin = createAdminClient();
  const commandeQuery = admin
    .from("commande")
    .select("id, product")
    .eq("student_id", input.studentId)
    .eq("categorie", "sujets")
    .limit(1);
  const { data: commandeData, error: commandeError } =
    reference.includes("-") || reference.length > 20
      ? await commandeQuery.eq("orderNumber", reference).maybeSingle()
      : await commandeQuery.eq("id", reference).maybeSingle();

  if (commandeError) {
    throw new Error(commandeError.message);
  }

  const commande = commandeData as { id: string; product: string | null } | null;

  if (!commande?.product) {
    return [];
  }

  const { data: sujetData, error: sujetError } = await admin
    .from("sujets")
    .select("jury")
    .eq("id", commande.product)
    .maybeSingle();

  if (sujetError) {
    throw new Error(sujetError.message);
  }

  if (!sujetData) {
    return [];
  }

  return parseSujetJury((sujetData as { jury?: unknown }).jury);
};

const getLatestSubjectDeliveryForReference = async (studentId: string, reference: string): Promise<boolean | null> => {
  const admin = createAdminClient();
  const { data: notificationRowsData, error: notificationRowsError } = await admin
    .from("notifications")
    .select("id, created_at, object, status")
    .eq("student_id", studentId)
    .eq("categorie", "sujets")
    .order("created_at", { ascending: false });

  if (notificationRowsError) {
    throw new Error(notificationRowsError.message);
  }

  const notificationRows = (notificationRowsData ?? []) as Array<{
    id: string;
    created_at: string;
    object: string | null;
    status: boolean | null;
  }>;

  const matching = notificationRows.find((row) => extractOrderReferenceFromObject(row.object) === reference);
  return matching ? matching.status === true : null;
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

const getSujetRowWithParent = async (notificationSujetId: string) => {
  const admin = createAdminClient();
  const { data: sujetData, error: sujetError } = await admin
    .from("notifications_sujet")
    .select(
      "id, created_at, notification_id, titre, directeur, co_directeur, thematique, justification, problematique, objectif, methodologie, resultats_attendus, chronogrammes, references, note, validation, observations",
    )
    .eq("id", notificationSujetId)
    .maybeSingle();

  if (sujetError) {
    throw new Error(sujetError.message);
  }

  if (!sujetData) {
    throw new Error("subject_notification_not_found");
  }

  const sujetRow = sujetData as SubjectNotificationRow;

  if (!sujetRow.notification_id) {
    throw new Error("subject_notification_parent_missing");
  }

  const { data: parentData, error: parentError } = await admin
    .from("notifications")
    .select("id, object, student_id, categorie, status, is_read")
    .eq("id", sujetRow.notification_id)
    .maybeSingle();

  if (parentError) {
    throw new Error(parentError.message);
  }

  if (!parentData) {
    throw new Error("subject_notification_parent_missing");
  }

  const parent = parentData as NotificationRow;

  if (parent.categorie !== "sujets") {
    throw new Error("invalid_subject_notification");
  }

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

  return {
    sujetRow,
    parent,
    student: studentData as StudentRow,
  };
};

const buildSubjectDocumentPayload = async (notificationSujetId: string): Promise<{
  payload: {
    projet: {
      validation: boolean;
      note: number;
      titre: string;
      directeur: string;
      co_directeur: string;
      thematique: string[];
      justification: string[];
      problematique: string[];
      objectif: string[];
      methodologie: SubjectSection[];
      resultats: SubjectSection[];
      chronogrammes: SubjectSection[];
      references: SubjectSection[];
    };
    student: {
      nom: string;
      email: string;
      telephone: string;
      matricule: string;
      programme: string;
      annee: string;
    };
  };
  parent: NotificationRow;
  student: StudentRow;
}> => {
  const data = await getSujetRowWithParent(notificationSujetId);
  const studentName = getCommandeStudentDisplayName(data.student);

  return {
    payload: {
      projet: {
        validation: data.sujetRow.validation ?? false,
        note: data.sujetRow.note ?? 0.0,
        titre: normalizeText(data.sujetRow.titre) ?? "Sujet de recherche",
        directeur: normalizeText(data.sujetRow.directeur) ?? "Directeur non renseigne",
        co_directeur: normalizeText(data.sujetRow.co_directeur) ?? "",
        thematique: parseStringSections(data.sujetRow.thematique),
        justification: parseStringSections(data.sujetRow.justification),
        problematique: parseStringSections(data.sujetRow.problematique),
        objectif: parseStringSections(data.sujetRow.objectif),
        methodologie: parseStructuredSections(data.sujetRow.methodologie),
        resultats: parseStructuredSections(data.sujetRow.resultats_attendus),
        chronogrammes: parseStructuredSections(data.sujetRow.chronogrammes),
        references: parseStructuredSections(data.sujetRow.references),
      },
      student: {
        nom: studentName,
        email: data.student.email ?? "Non renseigne",
        telephone: data.student.telephone ?? "Non renseigne",
        matricule: "Non renseigne",
        programme: "Non renseigne",
        annee: "Non renseignee",
      },
    },
    parent: data.parent,
    student: data.student,
  };
};

const buildSubjectPdfBuffer = async (
  notificationSujetId: string,
  verifyUrl: string,
  type: "Couverture" | "Protocle",
) => {
  const data = await buildSubjectDocumentPayload(notificationSujetId);
  const document = new PdfDocumentSujet(data.payload);

  await document.generate(verifyUrl, type);

  return {
    notificationSujetId,
    parent: data.parent,
    student: data.student,
    payload: data.payload,
    filename: `${type === "Couverture" ? "page-garde" : "protocole"}-sujet-${notificationSujetId}.pdf`,
    buffer: await document.generateBuffer(),
  };
};

export const getSubjectDocumentPayloadFromNotification = async (notificationSujetId: string) => {
  await assertOrganizerAccess();
  return buildSubjectDocumentPayload(notificationSujetId);
};

export const createSubjectResearchRequestNotification = async (input: {
  productId: string;
  title: string;
  director: string;
  coDirector: string | null;
  thematique: string[];
  justification: string[];
  problematique: string[];
  objectif: string[];
  methodologie: SubjectSection[];
  resultatsAttendus: SubjectSection[];
  chronogrammes: SubjectSection[];
  references: SubjectSection[];
}) => {
  const productData = await getProductPageData("sujets", input.productId);

  if (!productData.hasPaidAccess || !productData.existingSuccessCommande) {
    throw new Error("sujet_commande_not_paid");
  }

  const thematique = sanitizeStringSections(input.thematique);
  const justification = sanitizeStringSections(input.justification);
  const problematique = sanitizeStringSections(input.problematique);
  const objectif = sanitizeStringSections(input.objectif);
  const methodologie = sanitizeStructuredSections(input.methodologie);
  const resultatsAttendus = sanitizeStructuredSections(input.resultatsAttendus);
  const chronogrammes = sanitizeStructuredSections(input.chronogrammes);
  const references = sanitizeStructuredSections(input.references);

  if (!normalizeText(input.title) || !normalizeText(input.director)) {
    throw new Error("subject_request_invalid");
  }

  const admin = createAdminClient();
  const reference = productData.existingSuccessCommande.orderNumber ?? productData.existingSuccessCommande.id;
  const latestDelivery = await getLatestSubjectDeliveryForReference(productData.student.id, reference);

  if (latestDelivery === true) {
    throw new Error("subject_request_already_delivered");
  }

  const { data: notificationData, error: notificationError } = await admin
    .from("notifications")
    .insert({
      student_id: productData.student.id,
      object: `Demande sujet de recherche ${reference}`,
      description: `Soumission du sujet "${input.title}" pour ${productData.resource.title}.`,
      categorie: "sujets",
      path: "/notifications/sujets",
      status: false,
      is_read: false,
    })
    .select("id")
    .single();

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  const notificationId = (notificationData as { id: string }).id;
  const { data: sujetData, error: sujetError } = await admin
    .from("notifications_sujet")
    .insert({
      notification_id: notificationId,
      titre: input.title,
      directeur: input.director,
      co_directeur: input.coDirector,
      thematique,
      justification,
      problematique,
      objectif,
      methodologie,
      resultats_attendus: resultatsAttendus,
      chronogrammes,
      references,
    })
    .select("id")
    .single();

  if (sujetError) {
    throw new Error(sujetError.message);
  }

  const notificationSujetId = (sujetData as { id: string }).id;
  const { error: updateNotificationPathError } = await admin
    .from("notifications")
    .update({ path: `/notifications/sujets/${notificationSujetId}` })
    .eq("id", notificationId);

  if (updateNotificationPathError) {
    throw new Error(updateNotificationPathError.message);
  }

  return {
    notificationId,
    notificationSujetId,
    orderReference: reference,
  };
};

export type SubjectRequestNotificationItem = {
  id: string;
  createdAt: string;
  notificationId: string;
  title: string;
  director: string;
  coDirector: string | null;
  thematique: string[];
  justification: string[];
  problematique: string[];
  objectif: string[];
  methodologie: SubjectSection[];
  resultatsAttendus: SubjectSection[];
  chronogrammes: SubjectSection[];
  references: SubjectSection[];
  note: number | null;
  validation: boolean | null;
  observations: string[];
  notificationStatus: boolean;
  student: {
    id: string;
    displayName: string;
    email: string | null;
    telephone: string | null;
  } | null;
};

export const getSubjectRequestNotifications = async (): Promise<SubjectRequestNotificationItem[]> => {
  await assertOrganizerAccess();
  const admin = createAdminClient();

  const { data: subjectRowsData, error: subjectRowsError } = await admin
    .from("notifications_sujet")
    .select(
      "id, created_at, notification_id, titre, directeur, co_directeur, thematique, justification, problematique, objectif, methodologie, resultats_attendus, chronogrammes, references, note, validation, observations",
    )
    .order("created_at", { ascending: false });

  if (subjectRowsError) {
    throw new Error(subjectRowsError.message);
  }

  const subjectRows = (subjectRowsData ?? []) as SubjectNotificationRow[];
  const notificationIds = Array.from(
    new Set(subjectRows.map((row) => row.notification_id).filter((item): item is string => typeof item === "string" && item.length > 0)),
  );

  if (notificationIds.length === 0) {
    return [];
  }

  const { data: notificationRowsData, error: notificationRowsError } = await admin
    .from("notifications")
    .select("id, student_id, categorie, status, is_read, object, created_at")
    .in("id", notificationIds)
    .eq("categorie", "sujets");

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

  return subjectRows.flatMap((row) => {
    if (!row.notification_id) {
      return [];
    }

    const notification = notificationsById.get(row.notification_id);

    if (!notification) {
      return [];
    }

    const student = studentsById.get(notification.student_id) ?? null;
    const displayName = student ? getCommandeStudentDisplayName(student) : "Etudiant";

    return [
      {
        id: row.id,
        createdAt: row.created_at,
        notificationId: row.notification_id,
        title: normalizeText(row.titre) ?? "Sujet de recherche",
        director: normalizeText(row.directeur) ?? "Directeur non renseigne",
        coDirector: normalizeText(row.co_directeur),
        thematique: parseStringSections(row.thematique),
        justification: parseStringSections(row.justification),
        problematique: parseStringSections(row.problematique),
        objectif: parseStringSections(row.objectif),
        methodologie: parseStructuredSections(row.methodologie),
        resultatsAttendus: parseStructuredSections(row.resultats_attendus),
        chronogrammes: parseStructuredSections(row.chronogrammes),
        references: parseStructuredSections(row.references),
        note: typeof row.note === "number" && Number.isFinite(row.note) ? row.note : null,
        validation: typeof row.validation === "boolean" ? row.validation : null,
        observations: parseObservationLines(row.observations),
        notificationStatus: notification.status === true,
        student: student
          ? {
              id: student.id,
              displayName,
              email: student.email,
              telephone: student.telephone,
            }
          : null,
      } satisfies SubjectRequestNotificationItem,
    ];
  });
};

export const getSubjectRequestNotificationById = async (notificationSujetId: string): Promise<SubjectRequestNotificationItem | null> => {
  const items = await getSubjectRequestNotifications();
  return items.find((item) => item.id === notificationSujetId) ?? null;
};

export const generateSubjectCoverFromNotification = async (notificationSujetId: string) => {
  await assertOrganizerAccess();
  const admin = createAdminClient();
  const verificationBaseUrl = process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const verifyUrl = `${verificationBaseUrl}/api/verify/sujet/${encodeURIComponent(notificationSujetId)}?type=cover`;
  const result = await buildSubjectPdfBuffer(notificationSujetId, verifyUrl, "Couverture");

  const { error: notificationUpdateError } = await admin
    .from("notifications")
    .update({ status: true, is_read: true })
    .eq("id", result.parent.id);

  if (notificationUpdateError) {
    throw new Error(notificationUpdateError.message);
  }

  const { error: studentNotificationError } = await admin.from("notifications").insert({
    student_id: result.student.id,
    object: "Page de garde du sujet disponible",
    description: "Votre page de garde est prete. Vous pouvez la telecharger depuis votre espace.",
    categorie: "sujets_student",
    path: "/ressources",
    status: false,
    is_read: false,
  });

  if (studentNotificationError) {
    console.error("student subject notification insert failed", studentNotificationError);
  }

  return result;
};

export const generateSubjectCoverForStudent = async (notificationSujetId: string) => {
  const currentStudent = await getCurrentAuthenticatedStudent();
  const data = await getSujetRowWithParent(notificationSujetId);

  if (data.parent.student_id !== currentStudent.id) {
    throw new Error("access_denied");
  }

  const verificationBaseUrl = process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const verifyUrl = `${verificationBaseUrl}/api/verify/sujet/${encodeURIComponent(notificationSujetId)}?type=cover`;
  return buildSubjectPdfBuffer(notificationSujetId, verifyUrl, "Couverture");
};

export type StudentSubjectRequestState = {
  reference: string;
  delivered: boolean | null;
  locked: boolean;
};

export const getCurrentStudentSubjectRequestState = async (productId: string): Promise<StudentSubjectRequestState | null> => {
  const productData = await getProductPageData("sujets", productId);

  if (!productData.hasPaidAccess || !productData.existingSuccessCommande) {
    return null;
  }

  const reference = productData.existingSuccessCommande.orderNumber ?? productData.existingSuccessCommande.id;
  const delivered = await getLatestSubjectDeliveryForReference(productData.student.id, reference);

  return {
    reference,
    delivered,
    locked: delivered === true,
  };
};
