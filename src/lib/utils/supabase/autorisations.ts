import { getCurrentAgentAccess, normalizeAgentRole, type AgentRole, type AgentRecord } from "@/lib/utils/supabase/agents";
import { createAdminClient } from "@/lib/utils/supabase/admin";

export type AutorisationRecord = {
  id: string;
  created_at: string;
  designation: string | null;
  agent_id: string | null;
  is_active: string | null;
};

export type AutorisationCode = "CS" | "CE" | "CR" | "APP" | "SEC" | "T" | "J";

export type AgentOption = Pick<AgentRecord, "id" | "nom" | "post_nom" | "prenom" | "role">;

export type AutorisationWithAgent = AutorisationRecord & {
  agent: AgentOption | null;
  agentRole: AgentRole | null;
  agentDisplayName: string;
};

const emptyToNull = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const knownAutorisationCodes = new Set<AutorisationCode>(["CS", "CE", "CR", "APP", "SEC", "T", "J"]);

export const normalizeAutorisationCode = (value: string | null | undefined): AutorisationCode | null => {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();

  if (knownAutorisationCodes.has(normalizedValue as AutorisationCode)) {
    return normalizedValue as AutorisationCode;
  }

  return null;
};

export const autorisationLabels: Record<AutorisationCode, string> = {
  CS: "Chef de Section",
  CE: "Charge de l'enseignement",
  CR: "Charge de la Recherche",
  APP: "Appariteur",
  SEC: "Secretaire",
  T: "Titulaire",
  J: "Jury",
};

const buildAgentDisplayName = (agent: AgentOption | null) => {
  if (!agent) {
    return "Agent introuvable";
  }

  const name = [agent.prenom, agent.post_nom, agent.nom].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : "Agent sans nom";
};

const assertCanManageAuthorizations = async () => {
  const access = await getCurrentAgentAccess();

  if (!access.canManageAuthorizations) {
    throw new Error("access_denied");
  }
};

export const getAgentsForRoleAssignment = async () => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agents")
    .select("id, nom, post_nom, prenom, role")
    .order("prenom", { ascending: true })
    .order("nom", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AgentOption[];
};

export const getAutorisations = async () => {
  const admin = createAdminClient();
  const [{ data: autorisationsData, error: autorisationsError }, { data: agentsData, error: agentsError }] =
    await Promise.all([
      admin
        .from("autorisation")
        .select("id, created_at, designation, agent_id, is_active")
        .order("created_at", { ascending: false }),
      admin.from("agents").select("id, nom, post_nom, prenom, role"),
    ]);

  if (autorisationsError) {
    throw new Error(autorisationsError.message);
  }

  if (agentsError) {
    throw new Error(agentsError.message);
  }

  const agentsById = new Map(
    ((agentsData ?? []) as AgentOption[]).map((agent) => [agent.id, agent] as const),
  );

  return ((autorisationsData ?? []) as AutorisationRecord[]).map((item) => {
    const agent = item.agent_id ? agentsById.get(item.agent_id) ?? null : null;

    return {
      id: item.id,
      created_at: item.created_at,
      designation: item.designation,
      agent_id: item.agent_id,
      is_active: item.is_active,
      agent,
      agentRole: normalizeAgentRole(agent?.role),
      agentDisplayName: buildAgentDisplayName(agent),
    };
  }) as AutorisationWithAgent[];
};

export const getActiveAutorisationCodesForAgent = async (agentId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("autorisation")
    .select("designation, is_active")
    .eq("agent_id", agentId);

  if (error) {
    throw new Error(error.message);
  }

  const codes = new Set<AutorisationCode>();

  for (const item of (data ?? []) as Array<Pick<AutorisationRecord, "designation" | "is_active">>) {
    if (item.is_active?.toLowerCase() !== "oui") {
      continue;
    }

    const code = normalizeAutorisationCode(item.designation);

    if (code) {
      codes.add(code);
    }
  }

  return Array.from(codes);
};

export const getAutorisationById = async (id: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("autorisation")
    .select("id, created_at, designation, agent_id, is_active")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as AutorisationRecord | null;
};

export const saveAutorisation = async (formData: FormData) => {
  await assertCanManageAuthorizations();

  const id = emptyToNull(formData.get("id"));
  const designation = emptyToNull(formData.get("designation"));
  const isActive = emptyToNull(formData.get("is_active")) ?? "oui";
  const agentId = emptyToNull(formData.get("agent_id"));
  const role = normalizeAgentRole(emptyToNull(formData.get("role")));

  if (!agentId) {
    throw new Error("agent_required");
  }

  if (!role) {
    throw new Error("invalid_role");
  }

  const admin = createAdminClient();
  const { error: agentError } = await admin.from("agents").update({ role }).eq("id", agentId);

  if (agentError) {
    throw new Error(agentError.message);
  }

  const payload = {
    designation,
    agent_id: agentId,
    is_active: isActive,
  };

  if (id) {
    const { error } = await admin.from("autorisation").update(payload).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await admin.from("autorisation").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
};

export const deleteAutorisation = async (id: string) => {
  await assertCanManageAuthorizations();

  const admin = createAdminClient();
  const { error } = await admin.from("autorisation").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};
