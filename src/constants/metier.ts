/**
 * Métier (Business Variable) Constants
 * Defines available categories and role-based access
 */

import type { MetierCategorie, AgentRole } from "@/types/education";

export const METIER_CATEGORIES: Record<
  MetierCategorie,
  {
    label: string;
    color: string;
    bgColor: string;
    textColor: string;
    description: string;
  }
> = {
  sujets: {
    label: "Sujets",
    color: "blue",
    bgColor: "bg-blue-100 dark:bg-blue-900",
    textColor: "text-blue-800 dark:text-blue-200",
    description: "Sujets de recherche",
  },
  stages: {
    label: "Stages",
    color: "green",
    bgColor: "bg-green-100 dark:bg-green-900",
    textColor: "text-green-800 dark:text-green-200",
    description: "Demandes de stage",
  },
  laboratoires: {
    label: "Laboratoires",
    color: "purple",
    bgColor: "bg-purple-100 dark:bg-purple-900",
    textColor: "text-purple-800 dark:text-purple-200",
    description: "Accès laboratoire",
  },
  session: {
    label: "Session",
    color: "orange",
    bgColor: "bg-orange-100 dark:bg-orange-900",
    textColor: "text-orange-800 dark:text-orange-200",
    description: "Sessions d\'examen",
  },
  documents: {
    label: "Documents",
    color: "gray",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-800 dark:text-gray-200",
    description: "Documents académiques",
  },
};

/**
 * Role-based access to métier categories
 */
export const ROLE_METIER_ACCESS: Record<AgentRole, MetierCategorie[]> = {
  gestionnaire: ["sujets", "stages", "laboratoires", "session", "documents"],
  organisateur: ["session", "documents"],
  titulaire: ["sujets", "stages", "laboratoires"],
};

/**
 * Get available métiers for a given role
 */
export function getAvailableMetiersForRole(role: AgentRole | null): MetierCategorie[] {
  if (!role) return [];
  return ROLE_METIER_ACCESS[role] || [];
}

/**
 * Check if a role can access a specific métier
 */
export function canAccessMetier(role: AgentRole | null, categorie: MetierCategorie): boolean {
  if (!role) return false;
  return ROLE_METIER_ACCESS[role]?.includes(categorie) ?? false;
}

/**
 * Get display label for a métier category
 */
export function getMetierLabel(categorie: MetierCategorie): string {
  return METIER_CATEGORIES[categorie]?.label || categorie;
}

/**
 * Get color for a métier category
 */
export function getMetierColor(categorie: MetierCategorie): string {
  return METIER_CATEGORIES[categorie]?.color || "gray";
}

/**
 * Get all métier categories as array
 */
export function getAllMetiers(): MetierCategorie[] {
  return Object.keys(METIER_CATEGORIES) as MetierCategorie[];
}
