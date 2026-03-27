import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { createMicrosoft365Channel } from "@/lib/utils/microsoft-graph";
import { createAdminClient } from "@/lib/utils/supabase/admin";

export type SemestreRecord = {
  id: string;
  created_at: string;
  designation: string | null;
  credits: number | null;
  programme_id: string | null;
};

export type UniteRecord = {
  id: string;
  created_at: string;
  semestre_id: string | null;
  designation: string | null;
  code: string | null;
  credits: number | null;
};

export type MatiereRecord = {
  id: string;
  created_at: string;
  designation: string | null;
  unite_id: string | null;
  credits: number | null;
};

export type CoursRecord = {
  id: string;
  created_at: string;
  matiere_id: string | null;
  titulaire_id: string | null;
  slug: string | null;
  entra_id: string | null;
};

export type EnseignantOption = {
  id: string;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  email: string | null;
  role: string | null;
};

const emptyToNull = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const parseSmallInt = (value: FormDataEntryValue | null, field: string) => {
  const rawValue = emptyToNull(value);

  if (!rawValue) {
    return null;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`${field}_invalid`);
  }

  return parsedValue;
};

const assertCanManageTeaching = async () => {
  const user = await getAuthenticatedUser();

  if (!user || !user.canAccessAdmin || !user.agentId) {
    throw new Error("access_denied");
  }

  const activeCodes = await getActiveAutorisationCodesForAgent(user.agentId);

  if (!activeCodes.includes("CE")) {
    throw new Error("access_denied");
  }
};

export const getSemestresByProgramme = async (programmeId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("semestres")
    .select("id, created_at, designation, credits, programme_id")
    .eq("programme_id", programmeId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SemestreRecord[];
};

export const getSemestreById = async (id: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("semestres")
    .select("id, created_at, designation, credits, programme_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as SemestreRecord | null;
};

export const getUnitesBySemestreIds = async (semestreIds: string[]) => {
  if (semestreIds.length === 0) {
    return [] as UniteRecord[];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("unites")
    .select("id, created_at, semestre_id, designation, code, credits")
    .in("semestre_id", semestreIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as UniteRecord[];
};

export const getUniteById = async (id: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("unites")
    .select("id, created_at, semestre_id, designation, code, credits")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as UniteRecord | null;
};

export const getMatieresByUnite = async (uniteId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("matieres")
    .select("id, created_at, designation, unite_id, credits")
    .eq("unite_id", uniteId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MatiereRecord[];
};

export const getMatiereById = async (id: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("matieres")
    .select("id, created_at, designation, unite_id, credits")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as MatiereRecord | null;
};

export const getCoursByMatiereIds = async (matiereIds: string[]) => {
  if (matiereIds.length === 0) {
    return [] as CoursRecord[];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cours")
    .select("id, created_at, matiere_id, titulaire_id, slug, entra_id")
    .in("matiere_id", matiereIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CoursRecord[];
};

export const getCoursByMatiereId = async (matiereId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cours")
    .select("id, created_at, matiere_id, titulaire_id, slug, entra_id")
    .eq("matiere_id", matiereId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as CoursRecord | null;
};

export const getEnseignantsForCours = async () => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agents")
    .select("id, nom, post_nom, prenom, email, role")
    .order("prenom", { ascending: true })
    .order("nom", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EnseignantOption[];
};

export const createSemestre = async (formData: FormData) => {
  await assertCanManageTeaching();

  const programmeId = emptyToNull(formData.get("programme_id"));
  const designation = emptyToNull(formData.get("designation"));
  const credits = parseSmallInt(formData.get("credits"), "semestre_credits");

  if (!programmeId) {
    throw new Error("programme_required");
  }

  if (!designation) {
    throw new Error("semestre_designation_required");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("semestres").insert({
    programme_id: programmeId,
    designation,
    credits,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const updateSemestre = async (formData: FormData) => {
  await assertCanManageTeaching();

  const id = emptyToNull(formData.get("id"));
  const designation = emptyToNull(formData.get("designation"));
  const credits = parseSmallInt(formData.get("credits"), "semestre_credits");

  if (!id) {
    throw new Error("semestre_id_required");
  }

  if (!designation) {
    throw new Error("semestre_designation_required");
  }

  const admin = createAdminClient();
  const { data: unites, error: unitesError } = await admin.from("unites").select("credits").eq("semestre_id", id);

  if (unitesError) {
    throw new Error(unitesError.message);
  }

  const usedCredits = (unites ?? []).reduce((total, unite) => total + (unite.credits ?? 0), 0);

  if ((credits ?? 0) < usedCredits) {
    throw new Error("semestre_credits_below_assigned");
  }

  const { error } = await admin.from("semestres").update({ designation, credits }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};

export const deleteSemestre = async (id: string) => {
  await assertCanManageTeaching();

  const admin = createAdminClient();
  const { error } = await admin.from("semestres").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};

export const createUnite = async (formData: FormData) => {
  await assertCanManageTeaching();

  const semestreId = emptyToNull(formData.get("semestre_id"));
  const designation = emptyToNull(formData.get("designation"));
  const code = emptyToNull(formData.get("code"));
  const credits = parseSmallInt(formData.get("credits"), "unite_credits");

  if (!semestreId) {
    throw new Error("semestre_required");
  }

  if (!designation) {
    throw new Error("unite_designation_required");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("unites").insert({
    semestre_id: semestreId,
    designation,
    code,
    credits,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const deleteUnite = async (id: string) => {
  await assertCanManageTeaching();

  const admin = createAdminClient();
  const { error } = await admin.from("unites").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};

export const createMatiere = async (formData: FormData) => {
  await assertCanManageTeaching();

  const uniteId = emptyToNull(formData.get("unite_id"));
  const designation = emptyToNull(formData.get("designation"));
  const credits = parseSmallInt(formData.get("credits"), "matiere_credits");

  if (!uniteId) {
    throw new Error("unite_required");
  }

  if (!designation) {
    throw new Error("matiere_designation_required");
  }

  const admin = createAdminClient();
  const { data: unite, error: uniteError } = await admin
    .from("unites")
    .select("id, credits")
    .eq("id", uniteId)
    .maybeSingle();

  if (uniteError) {
    throw new Error(uniteError.message);
  }

  if (!unite) {
    throw new Error("unite_required");
  }

  const { data: matieres, error: matieresError } = await admin
    .from("matieres")
    .select("credits")
    .eq("unite_id", uniteId);

  if (matieresError) {
    throw new Error(matieresError.message);
  }

  const uniteCredits = unite.credits ?? 0;
  const usedCredits = (matieres ?? []).reduce((total, matiere) => total + (matiere.credits ?? 0), 0);
  const nextCredits = credits ?? 0;

  if (usedCredits + nextCredits > uniteCredits) {
    throw new Error("matiere_credits_exceed_unite");
  }

  const { error } = await admin.from("matieres").insert({
    unite_id: uniteId,
    designation,
    credits,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const deleteMatiere = async (id: string) => {
  await assertCanManageTeaching();

  const admin = createAdminClient();
  const { error } = await admin.from("matieres").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};

export const saveCoursForMatiere = async (formData: FormData) => {
  await assertCanManageTeaching();

  const matiereId = emptyToNull(formData.get("matiere_id"));
  const titulaireId = emptyToNull(formData.get("titulaire_id"));
  const slug = emptyToNull(formData.get("slug"));

  if (!matiereId) {
    throw new Error("matiere_required");
  }

  if (!titulaireId) {
    throw new Error("cours_enseignant_required");
  }

  if (!slug) {
    throw new Error("cours_slug_required");
  }

  const admin = createAdminClient();

  const [{ data: matiere, error: matiereError }, { data: titulaire, error: titulaireError }, existingCours] =
    await Promise.all([
      admin.from("matieres").select("id").eq("id", matiereId).maybeSingle(),
      admin.from("agents").select("id").eq("id", titulaireId).maybeSingle(),
      getCoursByMatiereId(matiereId),
    ]);

  if (matiereError) {
    throw new Error(matiereError.message);
  }

  if (!matiere) {
    throw new Error("matiere_required");
  }

  if (titulaireError) {
    throw new Error(titulaireError.message);
  }

  if (!titulaire) {
    throw new Error("cours_enseignant_invalid");
  }

  const payload = {
    matiere_id: matiereId,
    titulaire_id: titulaireId,
    slug,
  };

  const { error } = existingCours
    ? await admin.from("cours").update(payload).eq("id", existingCours.id)
    : await admin.from("cours").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
};

export const attachCoursToProgrammeTeam = async (formData: FormData) => {
  await assertCanManageTeaching();

  const programmeId = emptyToNull(formData.get("promotion"));
  const matiereId = emptyToNull(formData.get("matiere_id"));

  if (!programmeId) {
    throw new Error("programme_required");
  }

  if (!matiereId) {
    throw new Error("matiere_required");
  }

  const admin = createAdminClient();
  const [{ data: programme, error: programmeError }, cours] = await Promise.all([
    admin.from("programmes").select("id, designation, groupe_id").eq("id", programmeId).maybeSingle(),
    getCoursByMatiereId(matiereId),
  ]);

  if (programmeError) {
    throw new Error(programmeError.message);
  }

  if (!programme) {
    throw new Error("programme_required");
  }

  if (!programme.groupe_id) {
    throw new Error("programme_team_required");
  }

  if (!cours) {
    throw new Error("cours_required");
  }

  if (!cours.slug) {
    throw new Error("cours_channel_name_required");
  }

  if (!cours.titulaire_id) {
    throw new Error("cours_enseignant_required");
  }

  const matiere = await getMatiereById(matiereId);

  if (!matiere) {
    throw new Error("matiere_required");
  }

  const channel = await createMicrosoft365Channel({
    teamId: programme.groupe_id,
    displayName: cours.slug,
    description: `Canal du cours ${matiere.designation || "sans designation"} pour la promotion ${programme.designation || programme.id}.`,
  });

  const { error: updateError } = await admin
    .from("cours")
    .update({ entra_id: channel.channelId })
    .eq("id", cours.id);

  if (updateError) {
    throw new Error(updateError.message);
  }
};
