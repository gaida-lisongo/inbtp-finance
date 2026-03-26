import { getCurrentAgentAccess } from "@/lib/utils/supabase/agents";
import { createAdminClient } from "@/lib/utils/supabase/admin";

export type FiliereRecord = {
  id: string;
  created_at: string;
  designation: string | null;
  description: string | null;
  slug: string | null;
};

const emptyToNull = (value: FormDataEntryValue | null) => {
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

const assertCanManageFilieres = async () => {
  const access = await getCurrentAgentAccess();

  if (!access.canManageYears) {
    throw new Error("access_denied");
  }
};

export const getFilieres = async () => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("filieres")
    .select("*")
    .order("designation", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as FiliereRecord[];
};

export const getFiliereById = async (id: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("filieres").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as FiliereRecord | null;
};

export const saveFiliere = async (formData: FormData) => {
  await assertCanManageFilieres();

  const id = emptyToNull(formData.get("id"));
  const designation = emptyToNull(formData.get("designation"));
  const description = emptyToNull(formData.get("description"));
  const slugInput = emptyToNull(formData.get("slug"));
  const slug = slugInput ?? (designation ? slugify(designation) : null);

  const payload = {
    designation,
    description,
    slug,
  };

  const admin = createAdminClient();

  if (id) {
    const { error } = await admin.from("filieres").update(payload).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await admin.from("filieres").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
};

export const deleteFiliere = async (id: string) => {
  await assertCanManageFilieres();

  const admin = createAdminClient();
  const { error } = await admin.from("filieres").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};
