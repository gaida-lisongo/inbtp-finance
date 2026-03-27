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
