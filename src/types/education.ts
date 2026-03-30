/**
 * Education Platform Types
 * Shared types for dashboard, components, and actions
 */

export type AgentRole = "gestionnaire" | "organisateur" | "titulaire";

export type MetierCategorie = "sujets" | "stages" | "laboratoires" | "session" | "documents";

export interface CommandeMetrics {
  success: number;
  pending: number;
  categorie?: MetierCategorie;
}

export interface MonthlyDistribution {
  month: string;
  monthNumber: number;
  success: number;
  pending: number;
}

export interface DashboardFilterState {
  selectedAnneeId: string | null;
  selectedProgrammeId: string | null;
}

export interface ProductMetrics {
  categorie: MetierCategorie;
  success: number;
  pending: number;
  total: number;
}

export interface CommandeDetail {
  id: string;
  orderNumber: string | null;
  product: string | null;
  categorie: MetierCategorie;
  studentName: string;
  studentEmail: string;
  status: string;
  total: number | null;
  created_at: string;
  description: string | null;
}

export interface AcademicYear {
  id: string;
  annee: string;
  created_at: string;
}

export interface Promotion {
  id: string;
  nom: string;
  description: string | null;
  annee_id: string;
}
