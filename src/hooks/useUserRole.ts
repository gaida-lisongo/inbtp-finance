/**
 * useUserRole Hook
 * Client-side hook to access authenticated user role and permissions
 * Used in dashboard components for conditional rendering
 */

"use client";

import { useEffect, useState } from "react";
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
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Attempt to get user from window context or local storage
  // This assumes the parent server component passes user data somehow
  useEffect(() => {
    try {
      // Check if user data is available in window context
      // Fallback: This hook should receive user data as prop in real implementation
      // For now, we assume parent component provides it via context or prop
      const userData = (window as any).__AUTH_USER__;
      if (userData) {
        setUser(userData);
      }
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setIsLoading(false);
    }
  }, []);

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
    isLoading,
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
