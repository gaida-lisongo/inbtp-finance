export type AgentRole = "organisateur" | "gestionnaire" | "titulaire";

export type AgentRecord = {
  id: string;
  created_at?: string;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  email: string | null;
  grade: string | null;
  role: AgentRole | null;
};

const allowedRoles = new Set<AgentRole>(["organisateur", "gestionnaire", "titulaire"]);

export const normalizeAgentRole = (value: unknown): AgentRole | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return allowedRoles.has(normalized as AgentRole) ? (normalized as AgentRole) : null;
};

