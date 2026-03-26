import { getCurrentAgentAccess, normalizeAgentRole, type AgentRole, type AgentRecord } from "@/lib/utils/supabase/agents";
import { createAdminClient } from "@/lib/utils/supabase/admin";

export type AutorisationRecord = {
  id: string;
  created_at: string;
  designation: string | null;
  agent_id: string | null;
  is_active: string | null;
};

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
  const { data, error } = await admin
    .from("autorisation")
    .select("id, created_at, designation, agent_id, is_active, agents:agents!autorisation_agent_id_fkey(id, nom, post_nom, prenom, role)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<
    AutorisationRecord & {
      agents: AgentOption[] | null;
    }
  >).map((item) => {
    const agent = item.agents?.[0] ?? null;

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
