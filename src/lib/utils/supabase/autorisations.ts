import "server-only";

import { createAdminClient } from "@/lib/utils/supabase/admin";

export type AutorisationCode = "CS" | "CE" | "CR" | "APP" | "SEC" | "T" | "J";

export type AutorisationActiveState = "oui" | "non";

export type AutorisationRecord = {
  id: string;
  created_at: string;
  agent_id: string | null;
  designation: string | null;
  is_active: AutorisationActiveState | null;
};

export type AutorisationListItem = AutorisationRecord & {
  agentDisplayName: string;
  agentRole: string | null;
};

type AgentRow = {
  id: string;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  role: string | null;
};

const AUTORISATION_LABELS: Record<AutorisationCode, string> = {
  CS: "Chef de Section",
  CE: "Charge de l'enseignement",
  CR: "Charge de la Recherche",
  APP: "Appariteur",
  SEC: "Secretaire",
  T: "Titulaire",
  J: "Jury",
};

const KNOWN_CODES = new Set<AutorisationCode>(["CS", "CE", "CR", "APP", "SEC", "T", "J"]);

export async function normalizeAutorisationCode(value: string | null | undefined): Promise<AutorisationCode | null> {
  if (!value) return null;
  const normalizedValue = value.trim().toUpperCase();
  return KNOWN_CODES.has(normalizedValue as AutorisationCode) ? (normalizedValue as AutorisationCode) : null;
}

export async function getAutorisationLabels() {
  return AUTORISATION_LABELS;
}

const getAgentDisplayName = (agent: AgentRow | null) => {
  if (!agent) return "Agent inconnu";
  return [agent.prenom, agent.post_nom, agent.nom].filter(Boolean).join(" ").trim() || "Agent sans nom";
};

export async function getActiveAutorisationCodesForAgent(agentId: string): Promise<AutorisationCode[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("autorisation")
    .select("designation, is_active")
    .eq("agent_id", agentId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{ designation: string | null; is_active: AutorisationActiveState | null }>;
  const codes: AutorisationCode[] = [];

  for (const row of rows) {
    if (row.is_active !== "oui") continue;
    const code = await normalizeAutorisationCode(row.designation);
    if (code) codes.push(code);
  }

  return Array.from(new Set(codes));
}

export async function getAutorisations(): Promise<AutorisationListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("autorisation")
    .select("id, created_at, agent_id, designation, is_active")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const autorisations = (data ?? []) as AutorisationRecord[];
  const agentIds = Array.from(new Set(autorisations.map((item) => item.agent_id).filter(Boolean))) as string[];

  const agentsById = new Map<string, AgentRow>();
  if (agentIds.length > 0) {
    const { data: agentData, error: agentError } = await admin
      .from("agents")
      .select("id, nom, post_nom, prenom, role")
      .in("id", agentIds);

    if (agentError) {
      throw new Error(agentError.message);
    }

    for (const row of (agentData ?? []) as AgentRow[]) {
      agentsById.set(row.id, row);
    }
  }

  return autorisations.map((autorisation) => {
    const agent = autorisation.agent_id ? agentsById.get(autorisation.agent_id) ?? null : null;
    return {
      ...autorisation,
      agentDisplayName: getAgentDisplayName(agent),
      agentRole: agent?.role ? String(agent.role).toLowerCase() : null,
    };
  });
}

export async function getAutorisationById(id: string): Promise<AutorisationRecord | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("autorisation")
    .select("id, created_at, agent_id, designation, is_active")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AutorisationRecord | null) ?? null;
}

export async function getAgentsForRoleAssignment(): Promise<AgentRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agents")
    .select("id, nom, post_nom, prenom, role")
    .order("prenom", { ascending: true })
    .order("nom", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AgentRow[];
}

const emptyToNull = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeRole = (value: string | null): "organisateur" | "titulaire" | "gestionnaire" | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "organisateur" || normalized === "titulaire" || normalized === "gestionnaire") {
    return normalized;
  }
  return null;
};

const normalizeActiveState = (value: string | null): AutorisationActiveState => {
  if (value && value.trim().toLowerCase() === "non") return "non";
  return "oui";
};

export async function saveAutorisation(formData: FormData) {
  const id = emptyToNull(formData.get("id"));
  const agentId = emptyToNull(formData.get("agent_id"));
  const role = normalizeRole(emptyToNull(formData.get("role")));
  const designation = emptyToNull(formData.get("designation"));
  const is_active = normalizeActiveState(emptyToNull(formData.get("is_active")));

  if (!agentId) {
    throw new Error("agent_required");
  }

  if (!role) {
    throw new Error("invalid_role");
  }

  const code = await normalizeAutorisationCode(designation);
  if (!code) {
    throw new Error("invalid_designation");
  }

  const admin = createAdminClient();

  const { error: agentError } = await admin.from("agents").update({ role }).eq("id", agentId);
  if (agentError) {
    throw new Error(agentError.message);
  }

  const payload = {
    agent_id: agentId,
    designation: code,
    is_active,
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
}

export async function deleteAutorisation(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("autorisation").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

