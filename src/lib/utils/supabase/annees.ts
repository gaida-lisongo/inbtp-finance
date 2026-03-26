import { getCurrentAgentAccess } from "@/lib/utils/supabase/agents";
import { createAdminClient } from "@/lib/utils/supabase/admin";

export type AnneeRecord = {
  id: string;
  designation: string | null;
  date_debut: string | null;
  date_fin: string | null;
  description: string | null;
  created_at: string;
};

const emptyToNull = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

export const getAnnees = async () => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("annees")
    .select("*")
    .order("date_debut", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AnneeRecord[];
};

export const getAnneeById = async (id: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("annees").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as AnneeRecord | null;
};

const assertCanManageYears = async () => {
  const access = await getCurrentAgentAccess();

  if (!access.canManageYears) {
    throw new Error("access_denied");
  }
};

export const saveAnnee = async (formData: FormData) => {
  await assertCanManageYears();

  const payload = {
    designation: emptyToNull(formData.get("designation")),
    date_debut: emptyToNull(formData.get("date_debut")),
    date_fin: emptyToNull(formData.get("date_fin")),
    description: emptyToNull(formData.get("description")),
  };

  const id = emptyToNull(formData.get("id"));
  const admin = createAdminClient();

  if (id) {
    const { error } = await admin.from("annees").update(payload).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await admin.from("annees").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
};

export const deleteAnnee = async (id: string) => {
  await assertCanManageYears();

  const admin = createAdminClient();
  const { error } = await admin.from("annees").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};
