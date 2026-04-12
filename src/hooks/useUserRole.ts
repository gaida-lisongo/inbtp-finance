/**
 * useUserRole Hook
 * Client-side hook to access authenticated user role and permissions
 * Used in dashboard components for conditional rendering
 */

"use client";

import type { AuthenticatedUser } from "@/lib/utils/supabase/session";
import type { AgentRole, MetierCategorie } from "@/types/education";
import { canAccessMetier } from "@/constants/metier";

interface UseUserRoleReturn {
  user: AuthenticatedUser | null;
  role: AgentRole | null;
  isGestionnaire: boolean;
  isOrganisateur: boolean;
  canAccessDashboard: boolean;
  canAccessMetier: (categorie: MetierCategorie) => boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to get current user role and permissions
 * Requires AuthenticatedUser to be passed as prop from server component
 * or fetched via useEffect
 */
export function useUserRole(): UseUserRoleReturn {
  let user: AuthenticatedUser | null = null;
  let error: Error | null = null;

  try {
    if (typeof window !== "undefined") {
      user = ((window as unknown as { __AUTH_USER__?: AuthenticatedUser }).__AUTH_USER__ ?? null) as AuthenticatedUser | null;
    }
  } catch (err) {
    error = err instanceof Error ? err : new Error("Unknown error");
  }

  const role = (user?.role as AgentRole | null) || null;
  const isGestionnaire = role === "gestionnaire";
  const isOrganisateur = role === "organisateur";
  const canAccessDashboard = user?.canAccessAdmin ?? false;

  return {
    user,
    role,
    isGestionnaire,
    isOrganisateur,
    canAccessDashboard,
    canAccessMetier: (categorie: MetierCategorie) => canAccessMetier(role, categorie),
    isLoading: false,
    error,
  };
}

/**
 * Alternative version that takes user as prop
 * Preferred for better TypeScript support and testability
 */
export function useUserRoleWithData(user: AuthenticatedUser | null) {
  const role = (user?.role as AgentRole | null) || null;
  const isGestionnaire = role === "gestionnaire";
  const isOrganisateur = role === "organisateur";
  const canAccessDashboard = user?.canAccessAdmin ?? false;

  return {
    user,
    role,
    isGestionnaire,
    isOrganisateur,
    canAccessDashboard,
    canAccessMetier: (categorie: MetierCategorie) => canAccessMetier(role, categorie),
  };
}
