import { getCurrentAgentAccess } from "@/lib/utils/supabase/agents";
import { createAdminClient } from "@/lib/utils/supabase/admin";

export type ProgrammeRecord = {
  id: string;
  created_at: string;
  filiere_id: string | null;
  designation: string | null;
  description: string | null;
  annee_id: string | null;
  slug: string | null;
  groupe_id: string | null;
  systeme: string | null;
};

export type ProgrammeWithRelations = ProgrammeRecord & {
  filiereDesignation: string | null;
  anneeDesignation: string | null;
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

const assertCanManageProgrammes = async () => {
  const access = await getCurrentAgentAccess();

  if (!access.canManageProgramme) {
    throw new Error("access_denied");
  }
};

export const getProgrammes = async () => {
  const admin = createAdminClient();
  const [{ data: programmesData, error: programmesError }, { data: filieresData, error: filieresError }, { data: anneesData, error: anneesError }] =
    await Promise.all([
      admin.from("programmes").select("*").order("designation", { ascending: true }),
      admin.from("filieres").select("id, designation"),
      admin.from("annees").select("id, designation"),
    ]);

  if (programmesError) {
    throw new Error(programmesError.message);
  }

  if (filieresError) {
    throw new Error(filieresError.message);
  }

  if (anneesError) {
    throw new Error(anneesError.message);
  }

  const filieresById = new Map(
    ((filieresData ?? []) as Array<{ id: string; designation: string | null }>).map((item) => [item.id, item.designation] as const),
  );
  const anneesById = new Map(
    ((anneesData ?? []) as Array<{ id: string; designation: string | null }>).map((item) => [item.id, item.designation] as const),
  );

  return ((programmesData ?? []) as ProgrammeRecord[]).map((programme) => ({
    ...programme,
    filiereDesignation: programme.filiere_id ? filieresById.get(programme.filiere_id) ?? null : null,
    anneeDesignation: programme.annee_id ? anneesById.get(programme.annee_id) ?? null : null,
  })) as ProgrammeWithRelations[];
};

export const getProgrammeById = async (id: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("programmes").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProgrammeRecord | null;
};

export const saveProgramme = async (formData: FormData) => {
  await assertCanManageProgrammes();

  const id = emptyToNull(formData.get("id"));
  const designation = emptyToNull(formData.get("designation"));
  const description = emptyToNull(formData.get("description"));
  const slugInput = emptyToNull(formData.get("slug"));
  const slug = slugInput ?? (designation ? slugify(designation) : null);

  const payload = {
    filiere_id: emptyToNull(formData.get("filiere_id")),
    designation,
    description,
    annee_id: emptyToNull(formData.get("annee_id")),
    slug,
    groupe_id: emptyToNull(formData.get("groupe_id")),
    systeme: emptyToNull(formData.get("systeme")),
  };

  const admin = createAdminClient();

  if (id) {
    const { error } = await admin.from("programmes").update(payload).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await admin.from("programmes").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
};

export const deleteProgramme = async (id: string) => {
  await assertCanManageProgrammes();

  const admin = createAdminClient();
  const { error } = await admin.from("programmes").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};
