export type AgentRole = "organisateur" | "titulaire" | "gestionnaire";

export type AgentRecord = {
  id: string;
  user_id: string | null;
  grade: string | null;
  photo: string | null;
  role: string | null;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  telephone: string | null;
  bio: string | null;
  facebook: string | null;
  x: string | null;
  twitter: string | null;
  pays: string | null;
  ville: string | null;
  adresse: string | null;
  commune: string | null;
  created_at: string;
  entra_id: string | null;
  email?: string | null;
};

export type AgentProfile = AgentRecord & {
  email: string;
  displayName: string;
  photoUrl: string | null;
};

const allowedAgentRoles = new Set<AgentRole>(["organisateur", "titulaire", "gestionnaire"]);
const adminAgentRoles = new Set<AgentRole>(["organisateur", "gestionnaire"]);

export const normalizeAgentRole = (value: string | null | undefined): AgentRole | null => {
  if (!value) return null;
  const normalizedValue = value.trim().toLowerCase();
  return allowedAgentRoles.has(normalizedValue as AgentRole) ? (normalizedValue as AgentRole) : null;
};

export const isAdminAgentRole = (role: AgentRole | null) => Boolean(role && adminAgentRoles.has(role));
