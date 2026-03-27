import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { getCurrentAgentAccess } from "@/lib/utils/supabase/agents";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import type { StudentRecord } from "@/lib/utils/supabase/students-shared";

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
  matieres?: string | null;
  montant?: number | null;
  is_active?: string | null;
  slug?: string | null;
  entra_id?: string | null;
};

export type ParcoursInput = {
  id?: string | null;
  student_id: string;
  status?: string | null;
  reference?: string | null;
  programme_id: string;
};

const allowedParcoursStatuses = new Set(["ok", "pending", "no"]);

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

const parseDescriptionValue = (value: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return { text: value };
  }
};

const parseMatieresValue = (value: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
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

  const payload = {
    designation: emptyToNull(formData.get("designation")),
    description: parseDescriptionValue(emptyToNull(formData.get("description"))),
    date_debut: emptyToNull(formData.get("date_debut")),
    date_fin: emptyToNull(formData.get("date_fin")),
    programme_id: programmeId,
    matieres: parseMatieresValue(emptyToNull(formData.get("matieres"))),
    montant: numberToNull(formData.get("montant")),
    is_active: emptyToNull(formData.get("is_active")),
    slug: emptyToNull(formData.get("slug")),
    entra_id: emptyToNull(formData.get("entra_id")),
  };

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

  const payload = {
    designation: stringToNull(input.designation),
    description: parseDescriptionValue(stringToNull(input.description)),
    date_debut: stringToNull(input.date_debut),
    date_fin: stringToNull(input.date_fin),
    programme_id: input.programme_id,
    matieres: parseMatieresValue(stringToNull(input.matieres)),
    montant: input.montant ?? null,
    is_active: stringToNull(input.is_active),
    slug: stringToNull(input.slug),
    entra_id: stringToNull(input.entra_id),
  };

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
