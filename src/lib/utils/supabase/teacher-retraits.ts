import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export type TeacherRetraitActivityOption = {
  id: string;
  created_at: string;
  designation: string | null;
  categorie: string | null;
  montant: number | null;
  cours_id: string | null;
  cours_slug: string | null;
};

export type TeacherRetraitActivityRecord = {
  id: string;
  created_at: string;
  activity_id: string | null;
  montant: number | null;
  reference: string | null;
  status: string | null;
  observation: string | null;
  activity: TeacherRetraitActivityOption | null;
};

export type TeacherRetraitActivitySaveInput = {
  activity_id: string;
  montant: number;
  observation?: string | null;
};

const emptyToNull = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeAmount = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));

  if (!Number.isFinite(parsed)) {
    throw new Error("montant_invalid");
  }

  if (parsed < 0) {
    throw new Error("montant_invalid");
  }

  return Math.round(parsed * 100) / 100;
};

const getCurrentAuthenticatedTeacherAgentId = async () => {
  const user = await getAuthenticatedUser();

  if (!user || user.activePersona !== "teacher" || !user.agentId) {
    throw new Error("teacher_access_denied");
  }

  return user.agentId;
};

const getTeacherCourseIds = async (teacherAgentId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cours")
    .select("id")
    .eq("titulaire_id", teacherAgentId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
};

const getTeacherActivityOptionsByCourseIds = async (courseIds: string[]) => {
  if (courseIds.length === 0) {
    return [] as TeacherRetraitActivityOption[];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("activity")
    .select("id, created_at, designation, categorie, montant, cours_id, cours:cours(id, slug)")
    .in("cours_id", courseIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{
    id: string;
    created_at: string;
    designation: string | null;
    categorie: string | null;
    montant: number | null;
    cours_id: string | null;
    cours: { id: string; slug: string | null } | null;
  }>).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    designation: row.designation,
    categorie: row.categorie,
    montant: row.montant,
    cours_id: row.cours_id,
    cours_slug: row.cours?.slug ?? null,
  }));
};

const getTeacherActivityOptionsAndMap = async () => {
  const teacherAgentId = await getCurrentAuthenticatedTeacherAgentId();
  const courseIds = await getTeacherCourseIds(teacherAgentId);
  const activities = await getTeacherActivityOptionsByCourseIds(courseIds);
  const activityById = new Map(activities.map((row) => [row.id, row] as const));

  return { activities, activityById };
};

const assertTeacherOwnsActivity = async (activityId: string) => {
  const { activityById } = await getTeacherActivityOptionsAndMap();
  const activity = activityById.get(activityId);

  if (!activity) {
    throw new Error("activity_not_found");
  }

  return activity;
};

const assertTeacherOwnsRetrait = async (retraitId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("retraits_activity")
    .select("id, activity_id")
    .eq("id", retraitId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.activity_id) {
    throw new Error("retrait_not_found");
  }

  await assertTeacherOwnsActivity(data.activity_id);

  return data;
};

export const getTeacherRetraitActivities = async (): Promise<TeacherRetraitActivityOption[]> => {
  const { activities } = await getTeacherActivityOptionsAndMap();
  return activities;
};

export const getTeacherRetraitsActivity = async (): Promise<TeacherRetraitActivityRecord[]> => {
  const { activities, activityById } = await getTeacherActivityOptionsAndMap();
  const activityIds = activities.map((row) => row.id);

  if (activityIds.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("retraits_activity")
    .select("id, created_at, activity_id, montant, reference, status, observation")
    .in("activity_id", activityIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{
    id: string;
    created_at: string;
    activity_id: string | null;
    montant: number | null;
    reference: string | null;
    status: string | null;
    observation: string | null;
  }>).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    activity_id: row.activity_id,
    montant: row.montant,
    reference: row.reference,
    status: row.status,
    observation: row.observation,
    activity: row.activity_id ? activityById.get(row.activity_id) ?? null : null,
  }));
};

export const createTeacherRetraitActivity = async (input: TeacherRetraitActivitySaveInput) => {
  const activityId = emptyToNull(input.activity_id);

  if (!activityId) {
    throw new Error("activity_required");
  }

  const montant = normalizeAmount(input.montant);
  await assertTeacherOwnsActivity(activityId);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("retraits_activity")
    .insert({
      activity_id: activityId,
      montant,
      reference: null,
      status: "pending",
      observation: emptyToNull(input.observation),
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const updateTeacherRetraitActivity = async (
  retraitId: string,
  input: TeacherRetraitActivitySaveInput,
) => {
  if (!retraitId) {
    throw new Error("retrait_required");
  }

  await assertTeacherOwnsRetrait(retraitId);

  const activityId = emptyToNull(input.activity_id);

  if (!activityId) {
    throw new Error("activity_required");
  }

  const montant = normalizeAmount(input.montant);
  await assertTeacherOwnsActivity(activityId);

  const admin = createAdminClient();
  const { error } = await admin
    .from("retraits_activity")
    .update({
      activity_id: activityId,
      montant,
      observation: emptyToNull(input.observation),
    })
    .eq("id", retraitId);

  if (error) {
    throw new Error(error.message);
  }
};

export const deleteTeacherRetraitActivity = async (retraitId: string) => {
  if (!retraitId) {
    throw new Error("retrait_required");
  }

  await assertTeacherOwnsRetrait(retraitId);

  const admin = createAdminClient();
  const { error } = await admin.from("retraits_activity").delete().eq("id", retraitId);

  if (error) {
    throw new Error(error.message);
  }
};
