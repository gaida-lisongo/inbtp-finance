import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import type { ResearchRecord, ResearchTableName } from "@/lib/utils/supabase/recherche-shared";

const emptyToNull = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const numberToNull = (value: FormDataEntryValue | null, field: string) => {
  const normalizedValue = emptyToNull(value);

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${field}_invalid`);
  }

  return parsedValue;
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

const assertCanManageResearch = async () => {
  const user = await getAuthenticatedUser();

  if (!user || !user.canAccessAdmin || !user.agentId) {
    throw new Error("access_denied");
  }

  const activeCodes = await getActiveAutorisationCodesForAgent(user.agentId);

  if (!activeCodes.includes("CR")) {
    throw new Error("access_denied");
  }
};

const getResearchRecordsByProgramme = async (tableName: ResearchTableName, programmeId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(tableName)
    .select("*")
    .eq("programme_id", programmeId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ResearchRecord[];
};

export const getStagesByProgramme = async (programmeId: string) => getResearchRecordsByProgramme("stages", programmeId);

export const getSujetsByProgramme = async (programmeId: string) => getResearchRecordsByProgramme("sujets", programmeId);

export const getLaboratoiresByProgramme = async (programmeId: string) => getResearchRecordsByProgramme("laboratoires", programmeId);

export const saveResearchRecord = async (tableName: ResearchTableName, formData: FormData) => {
  await assertCanManageResearch();

  const id = emptyToNull(formData.get("id"));
  const programmeId = emptyToNull(formData.get("programme_id"));

  if (!programmeId) {
    throw new Error("programme_required");
  }

  const payload = {
    programme_id: programmeId,
    montant: numberToNull(formData.get("montant"), "montant"),
    description: parseDescriptionValue(emptyToNull(formData.get("description"))),
    slug: emptyToNull(formData.get("slug")),
    entra_id: emptyToNull(formData.get("entra_id")),
    is_active: emptyToNull(formData.get("is_active")),
  };

  const admin = createAdminClient();

  if (id) {
    const { error } = await admin.from(tableName).update(payload).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await admin.from(tableName).insert(payload);

  if (error) {
    throw new Error(error.message);
  }
};

export const deleteResearchRecord = async (tableName: ResearchTableName, id: string) => {
  await assertCanManageResearch();

  const admin = createAdminClient();
  const { error } = await admin.from(tableName).delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};
