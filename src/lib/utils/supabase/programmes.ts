import { getCurrentAgentAccess } from "@/lib/utils/supabase/agents";
import { createMicrosoft365Team } from "@/lib/utils/microsoft-graph";
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

const getMailNickname = (slug: string, programmeId: string) => {
  const normalizedSlug = slugify(slug).slice(0, 40);
  const normalizedId = programmeId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 12);
  return `${normalizedSlug || "programme"}-${normalizedId}`;
};

const assertCanManageProgrammes = async () => {
  const access = await getCurrentAgentAccess();

  if (!access.canManageProgramme) {
    throw new Error("access_denied");
  }

  return access;
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

  if (!slug) {
    throw new Error("programme_slug_required");
  }

  const payload = {
    filiere_id: emptyToNull(formData.get("filiere_id")),
    designation,
    description,
    annee_id: emptyToNull(formData.get("annee_id")),
    slug,
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

export const bulkAttachProgrammesToTeams = async (programmeIds: string[]) => {
  const access = await assertCanManageProgrammes();

  const sanitizedProgrammeIds = Array.from(new Set(programmeIds.map((id) => id.trim()).filter(Boolean)));

  if (sanitizedProgrammeIds.length === 0) {
    throw new Error("programme_selection_required");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("programmes").select("*").in("id", sanitizedProgrammeIds);

  if (error) {
    throw new Error(error.message);
  }

  const programmes = (data ?? []) as ProgrammeRecord[];

  if (programmes.length === 0) {
    throw new Error("programme_not_found");
  }

  let linkedCount = 0;
  const ownerEntraId = access.agent?.entra_id;

  if (!ownerEntraId) {
    throw new Error("programme_team_owner_missing");
  }

  for (const programme of programmes) {
    if (programme.groupe_id) {
      continue;
    }

    if (!programme.slug) {
      continue;
    }

    const team = await createMicrosoft365Team({
      displayName: programme.designation || programme.slug,
      description: programme.description,
      mailNickname: getMailNickname(programme.slug, programme.id),
      ownerEntraId,
    });

    const { error: updateError } = await admin.from("programmes").update({ groupe_id: team.groupId }).eq("id", programme.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    linkedCount += 1;
  }

  if (linkedCount === 0) {
    throw new Error("programme_bulk_team_noop");
  }

  return linkedCount;
};

export const deleteProgramme = async (id: string) => {
  await assertCanManageProgrammes();

  const admin = createAdminClient();
  const { error } = await admin.from("programmes").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};
