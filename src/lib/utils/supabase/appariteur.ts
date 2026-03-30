import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { getCurrentAgentAccess } from "@/lib/utils/supabase/agents";
import { sendMicrosoft365Mail } from "@/lib/utils/microsoft-graph";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import type { StudentRecord } from "@/lib/utils/supabase/students-shared";

const appUrl = process.env.NEXT_PUBLIC_HOST_URL;

export type SessionRecord = {
  id: string;
  created_at: string;
  designation: string | null;
  description: unknown;
  date_debut: string | null;
  date_fin: string | null;
  programme_id: string | null;
  matieres: unknown;
  montant: number | null;
  is_active: string | null;
  slug: string | null;
  entra_id: string | null;
};

export type ParcoursRecord = {
  id: string;
  created_at: string;
  student_id: string | null;
  status: string | null;
  reference: string | null;
  programme_id: string | null;
};

export type ParcoursWithStudent = ParcoursRecord & {
  student: StudentRecord | null;
};

export type SessionInput = {
  id?: string | null;
  designation?: string | null;
  description?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  programme_id: string;
  matieres?: SessionMatiereInput[] | string | null;
  montant?: number | null;
  is_active?: string | null;
  slug?: string | null;
  entra_id?: string | null;
};

export type SessionMatiereInput = {
  matiere?: string | null;
  date_epreuve?: string | null;
};

export type SessionNotificationResult = {
  notifiedCount: number;
  skippedCount: number;
};

export type ParcoursInput = {
  id?: string | null;
  student_id: string;
  status?: string | null;
  reference?: string | null;
  programme_id: string;
};

const allowedParcoursStatuses = new Set(["ok", "pending", "no"]);
const allowedSessionStatuses = new Set(["true", "false"]);

const emptyToNull = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const numberToNull = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const stringToNull = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildSessionDescriptionPayload = (value: string | null) => {
  if (!value) {
    return null;
  }

  return { text: value };
};

const normalizeSessionMatiereItem = (value: unknown): SessionMatiereInput | null => {
  if (typeof value === "string") {
    const matiere = stringToNull(value);
    return matiere ? { matiere, date_epreuve: null } : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const matiere = stringToNull(typeof record.matiere === "string" ? record.matiere : null);
  const dateEpreuve = stringToNull(
    typeof record.date_epreuve === "string"
      ? record.date_epreuve
      : typeof record.date === "string"
        ? record.date
        : null,
  );

  if (!matiere && !dateEpreuve) {
    return null;
  }

  return {
    matiere,
    date_epreuve: dateEpreuve,
  };
};

const parseSessionMatieresInput = (value: SessionInput["matieres"]): SessionMatiereInput[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(normalizeSessionMatiereItem).filter(Boolean) as SessionMatiereInput[];
  }

  try {
    const parsedValue = JSON.parse(value);
    if (Array.isArray(parsedValue)) {
      return parsedValue.map(normalizeSessionMatiereItem).filter(Boolean) as SessionMatiereInput[];
    }
  } catch {
    return value
      .split("\n")
      .map((item) => normalizeSessionMatiereItem(item))
      .filter(Boolean) as SessionMatiereInput[];
  }

  return [];
};

const validateSessionMatieres = (items: SessionMatiereInput[]) => {
  if (items.length === 0) {
    throw new Error("session_matieres_required");
  }

  return items.map((item, index) => {
    const matiere = stringToNull(item.matiere);
    const dateEpreuve = stringToNull(item.date_epreuve);

    if (!matiere) {
      throw new Error(`session_matiere_required_${index + 1}`);
    }

    if (!dateEpreuve) {
      throw new Error(`session_matiere_date_required_${index + 1}`);
    }

    return {
      matiere,
      date_epreuve: dateEpreuve,
    };
  });
};

const normalizeSessionStatus = (value: string | null | undefined) => {
  const normalizedValue = stringToNull(value)?.toLowerCase() ?? "false";

  if (!allowedSessionStatuses.has(normalizedValue)) {
    throw new Error("invalid_session_status");
  }

  return normalizedValue;
};

const getSessionSlug = (input: {
  slug?: string | null;
  designation?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
}) => {
  const explicitSlug = stringToNull(input.slug);

  if (explicitSlug) {
    return slugify(explicitSlug);
  }

  const parts = [stringToNull(input.designation), stringToNull(input.date_debut), stringToNull(input.date_fin)].filter(Boolean);
  const generatedSlug = slugify(parts.join("-"));

  if (!generatedSlug) {
    throw new Error("session_slug_required");
  }

  return generatedSlug;
};

const validateSessionPayload = (input: {
  designation?: string | null;
  description?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  matieres?: SessionInput["matieres"];
  montant?: number | null;
  is_active?: string | null;
  slug?: string | null;
  programme_id: string;
  entra_id?: string | null;
}) => {
  const designation = stringToNull(input.designation);
  const dateDebut = stringToNull(input.date_debut);
  const dateFin = stringToNull(input.date_fin);

  if (!designation) {
    throw new Error("session_designation_required");
  }

  if (!dateDebut) {
    throw new Error("session_date_debut_required");
  }

  if (!dateFin) {
    throw new Error("session_date_fin_required");
  }

  if (dateFin < dateDebut) {
    throw new Error("session_invalid_period");
  }

  if (input.montant != null && (!Number.isFinite(input.montant) || input.montant < 0)) {
    throw new Error("session_invalid_montant");
  }

  const matieres = validateSessionMatieres(parseSessionMatieresInput(input.matieres));

  return {
    designation,
    description: buildSessionDescriptionPayload(stringToNull(input.description)),
    date_debut: dateDebut,
    date_fin: dateFin,
    programme_id: input.programme_id,
    matieres,
    montant: input.montant ?? null,
    is_active: normalizeSessionStatus(input.is_active),
    slug: getSessionSlug(input),
    entra_id: stringToNull(input.entra_id),
  };
};

export const formatJsonField = (value: unknown) => {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
};

const assertCanManageApp = async () => {
  const access = await getCurrentAgentAccess();

  if (!access.agent?.id) {
    throw new Error("access_denied");
  }

  const activeCodes = await getActiveAutorisationCodesForAgent(access.agent.id);

  if (!activeCodes.includes("APP")) {
    throw new Error("access_denied");
  }
};

export const getSessionsByProgramme = async (programmeId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("session")
    .select("*")
    .eq("programme_id", programmeId)
    .order("date_debut", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SessionRecord[];
};

export const getSessionById = async (id: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("session").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as SessionRecord | null;
};

export const saveSession = async (formData: FormData) => {
  await assertCanManageApp();

  const id = emptyToNull(formData.get("id"));
  const programmeId = emptyToNull(formData.get("programme_id"));

  if (!programmeId) {
    throw new Error("programme_required");
  }

  const payload = validateSessionPayload({
    designation: emptyToNull(formData.get("designation")),
    description: emptyToNull(formData.get("description")),
    date_debut: emptyToNull(formData.get("date_debut")),
    date_fin: emptyToNull(formData.get("date_fin")),
    programme_id: programmeId,
    matieres: emptyToNull(formData.get("matieres")),
    montant: numberToNull(formData.get("montant")),
    is_active: emptyToNull(formData.get("is_active")),
    slug: emptyToNull(formData.get("slug")),
    entra_id: emptyToNull(formData.get("entra_id")),
  });

  const admin = createAdminClient();

  if (id) {
    const { error } = await admin.from("session").update(payload).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await admin.from("session").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
};

export const deleteSession = async (id: string) => {
  await assertCanManageApp();

  const admin = createAdminClient();
  const { error } = await admin.from("session").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};

export const getParcoursByProgramme = async (programmeId: string) => {
  const admin = createAdminClient();
  const [{ data: parcoursData, error: parcoursError }, { data: studentsData, error: studentsError }] = await Promise.all([
    admin.from("parcours").select("*").eq("programme_id", programmeId).order("created_at", { ascending: false }),
    admin.from("students").select("*"),
  ]);

  if (parcoursError) {
    throw new Error(parcoursError.message);
  }

  if (studentsError) {
    throw new Error(studentsError.message);
  }

  const studentsById = new Map(((studentsData ?? []) as StudentRecord[]).map((student) => [student.id, student] as const));

  return ((parcoursData ?? []) as ParcoursRecord[]).map((parcours) => ({
    ...parcours,
    student: parcours.student_id ? studentsById.get(parcours.student_id) ?? null : null,
  })) as ParcoursWithStudent[];
};

export const getParcoursById = async (id: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("parcours").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ParcoursRecord | null;
};

const normalizeParcoursStatus = (value: string | null | undefined) => {
  const normalizedValue = stringToNull(value)?.toLowerCase() ?? null;

  if (!normalizedValue) {
    return null;
  }

  if (!allowedParcoursStatuses.has(normalizedValue)) {
    throw new Error("invalid_parcours_status");
  }

  return normalizedValue;
};

export const saveSessionRecord = async (input: SessionInput) => {
  await assertCanManageApp();

  if (!input.programme_id) {
    throw new Error("programme_required");
  }

  const payload = validateSessionPayload(input);

  const admin = createAdminClient();

  if (input.id) {
    const { data, error } = await admin.from("session").update(payload).eq("id", input.id).select("*").single();

    if (error) {
      throw new Error(error.message);
    }

    return data as SessionRecord;
  }

  const { data, error } = await admin.from("session").insert(payload).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SessionRecord;
};

const getSessionNotificationContent = (session: SessionRecord, programmeDesignation: string | null) => {
  const title = session.designation || "Nouvelle session";
  const relativeUrl = `/commande/session/${session.id}`;
  const absoluteUrl = appUrl ? `${appUrl.replace(/\/$/, "")}${relativeUrl}` : relativeUrl;
  const description =
    session.description && typeof session.description === "object" && "text" in (session.description as Record<string, unknown>)
      ? stringToNull(String((session.description as Record<string, unknown>).text ?? ""))
      : null;
  const matieres = Array.isArray(session.matieres) ? (session.matieres as SessionMatiereInput[]) : [];
  const matieresHtml = matieres
    .map((item) => {
      const matiere = stringToNull(item.matiere) ?? "Matiere";
      const dateEpreuve = stringToNull(item.date_epreuve) ?? "Date non renseignee";
      return `<li style="margin:0 0 8px;">${matiere} - ${dateEpreuve}</li>`;
    })
    .join("");

  return {
    subject: `Nouvelle session d'enrollement - ${title}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px;color:#1f2937;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #e5e7eb;overflow:hidden;">
          <div style="padding:24px 28px;background:#111827;color:#ffffff;">
            <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.8;">Notification academique</div>
            <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;">Nouvelle session d'enrollement</h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">
              Une nouvelle session est ouverte pour votre promotion <strong>${programmeDesignation || "Promotion"}</strong>.
            </p>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.8;"><strong>Designation:</strong> ${title}</p>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.8;"><strong>Periode:</strong> ${session.date_debut ?? "Non renseignee"} au ${session.date_fin ?? "Non renseignee"}</p>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.8;"><strong>Montant:</strong> ${session.montant != null ? `${session.montant} USD` : "Non renseigne"}</p>
            ${description ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.8;"><strong>Description:</strong> ${description}</p>` : ""}
            <div style="margin-top:20px;">
              <p style="margin:0 0 10px;font-size:15px;line-height:1.8;"><strong>Matieres et dates d'epreuve</strong></p>
              <ul style="padding-left:18px;margin:0;font-size:15px;line-height:1.8;">
                ${matieresHtml}
              </ul>
            </div>
            <div style="margin-top:24px;">
              <a href="${absoluteUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">
                Ouvrir la commande
              </a>
            </div>
          </div>
        </div>
      </div>
    `,
  };
};

export const notifyStudentsForSession = async (programmeId: string, sessionId: string): Promise<SessionNotificationResult> => {
  await assertCanManageApp();

  const admin = createAdminClient();
  const [{ data: session, error: sessionError }, { data: programme, error: programmeError }, { data: parcoursData, error: parcoursError }, { data: studentsData, error: studentsError }] =
    await Promise.all([
      admin.from("session").select("*").eq("id", sessionId).eq("programme_id", programmeId).maybeSingle(),
      admin.from("programmes").select("designation").eq("id", programmeId).maybeSingle(),
      admin.from("parcours").select("student_id").eq("programme_id", programmeId),
      admin.from("students").select("id, email"),
    ]);

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    throw new Error("session_not_found");
  }

  if (programmeError) {
    throw new Error(programmeError.message);
  }

  if (parcoursError) {
    throw new Error(parcoursError.message);
  }

  if (studentsError) {
    throw new Error(studentsError.message);
  }

  const studentIds = new Set(
    ((parcoursData ?? []) as Array<{ student_id: string | null }>)
      .map((item) => item.student_id)
      .filter(Boolean) as string[],
  );

  const emails = Array.from(
    new Set(
      ((studentsData ?? []) as Array<{ id: string; email: string | null }>)
        .filter((student) => studentIds.has(student.id))
        .map((student) => student.email?.trim().toLowerCase() ?? "")
        .filter(Boolean),
    ),
  );

  if (emails.length === 0) {
    throw new Error("session_notification_no_student_email");
  }

  const content = getSessionNotificationContent(session as SessionRecord, (programme as { designation: string | null } | null)?.designation ?? null);

  await sendMicrosoft365Mail({
    to: emails,
    subject: content.subject,
    html: content.html,
  });

  return {
    notifiedCount: emails.length,
    skippedCount: studentIds.size - emails.length,
  };
};

const resolveParcoursWithStudent = async (parcours: ParcoursRecord) => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("students").select("*").eq("id", parcours.student_id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...parcours,
    student: (data as StudentRecord | null) ?? null,
  } as ParcoursWithStudent;
};

export const saveParcoursRecord = async (input: ParcoursInput) => {
  await assertCanManageApp();

  if (!input.programme_id) {
    throw new Error("programme_required");
  }

  if (!input.student_id) {
    throw new Error("student_required");
  }

  const payload = {
    student_id: input.student_id,
    status: normalizeParcoursStatus(input.status),
    reference: stringToNull(input.reference),
    programme_id: input.programme_id,
  };

  const admin = createAdminClient();

  if (input.id) {
    const { data, error } = await admin.from("parcours").update(payload).eq("id", input.id).select("*").single();

    if (error) {
      throw new Error(error.message);
    }

    return resolveParcoursWithStudent(data as ParcoursRecord);
  }

  const { data, error } = await admin.from("parcours").insert(payload).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return resolveParcoursWithStudent(data as ParcoursRecord);
};

export const bulkCreateParcoursFromCsv = async (programmeId: string, csvContent: string) => {
  await assertCanManageApp();

  const normalizedProgrammeId = stringToNull(programmeId);

  if (!normalizedProgrammeId) {
    throw new Error("programme_required");
  }

  const trimmedContent = csvContent.trim();

  if (!trimmedContent) {
    throw new Error("csv_content_required");
  }

  const lines = trimmedContent.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("csv_missing_rows");
  }

  const header = lines[0].split(",").map((value) => value.trim().toLowerCase());
  const expectedHeader = ["email", "reference", "status"];

  if (expectedHeader.some((column, index) => header[index] !== column)) {
    throw new Error("csv_invalid_header");
  }

  const admin = createAdminClient();
  const { data: studentsData, error: studentsError } = await admin.from("students").select("*");

  if (studentsError) {
    throw new Error(studentsError.message);
  }

  const studentsByEmail = new Map(
    ((studentsData ?? []) as StudentRecord[])
      .filter((student) => typeof student.email === "string" && student.email.trim().length > 0)
      .map((student) => [student.email!.trim().toLowerCase(), student] as const),
  );

  const payload = lines.slice(1).map((line, index) => {
    const [emailValue = "", referenceValue = "", statusValue = ""] = line.split(",").map((value) => value.trim());
    const normalizedEmail = emailValue.toLowerCase();
    const student = studentsByEmail.get(normalizedEmail);

    if (!student) {
      throw new Error(`email_not_found_line_${index + 2}`);
    }

    return {
      student_id: student.id,
      reference: stringToNull(referenceValue),
      status: normalizeParcoursStatus(statusValue),
      programme_id: normalizedProgrammeId,
    };
  });

  const { error } = await admin.from("parcours").insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  return getParcoursByProgramme(normalizedProgrammeId);
};

export const saveParcours = async (formData: FormData) => {
  await saveParcoursRecord({
    id: emptyToNull(formData.get("id")),
    student_id: emptyToNull(formData.get("student_id")) ?? "",
    status: emptyToNull(formData.get("status")),
    reference: emptyToNull(formData.get("reference")),
    programme_id: emptyToNull(formData.get("programme_id")) ?? "",
  });
};

export const deleteParcours = async (id: string) => {
  await assertCanManageApp();

  const admin = createAdminClient();
  const { error } = await admin.from("parcours").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};
