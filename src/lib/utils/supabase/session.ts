'use server'

import { 
  type AccountType, 
} from "@/lib/utils/supabase/agents";
import { isAdminAgentRole, normalizeAgentRole, type AgentRole } from "./agents-shared";
import { getUser } from "@/app/actions/user";
import { createAdminClient } from "@/lib/utils/supabase/admin";

export type ActivePersona = "admin" | "student" | "teacher";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  accountType: AccountType;
  loginMode: any | null;
  activePersona: ActivePersona;
  agentId: string | null;
  role: AgentRole | null;
  canAccessAdmin: boolean;
  canManageYears: boolean;
  canManageAuthorizations: boolean;
  canManageStudents: boolean;
  canManageFiliere: boolean;
  canManageProgramme: boolean;
  canManageCharges: boolean;
};

const supabaseBucket = process.env.SUPABASE_BUCKET;
const signedUrlExpiresInSeconds = 60 * 60;

/**
 * Résout l'URL de l'avatar (gère les URLs signées si nécessaire)
 */
const resolveAvatarUrl = async (avatarUrl: string | null) => {
  if (!avatarUrl) return null;
  if (!supabaseBucket || avatarUrl.startsWith('http')) return avatarUrl;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(supabaseBucket)
      .createSignedUrl(avatarUrl, signedUrlExpiresInSeconds);

    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
};

/**
 * Détermine le Persona actif en fonction du rôle BDD
 */
const resolveActivePersona = (role: AgentRole | null): ActivePersona => {
  if (!role) return "student";
  if (role === "titulaire") return "teacher";
  if (isAdminAgentRole(role)) return "admin";
  return "student";
};

/**
 * Transforme les données brutes du JWT en objet AuthenticatedUser structuré
 */
const buildAuthenticatedUser = async (userData: any): Promise<AuthenticatedUser | null> => {
  if (!userData || !userData.email) return null;

  const role = normalizeAgentRole(userData.role);
  const activePersona = resolveActivePersona(role);
  
  const isOrganizer = role === "organisateur";
  const isGestionnaire = role === "gestionnaire";
  const isTitulaire = role === "titulaire";

  return {
    id: userData.user_id || userData.id,
    email: userData.email,
    name: `${userData.prenom || ''} ${userData.nom || ''} ${userData.post_nom || ''}`.trim() || userData.email,
    avatarUrl: await resolveAvatarUrl(userData.photo),
    accountType: activePersona === "student" ? "student" : "agent",
    loginMode: null, // Plus utilisé avec le système JWT custom
    activePersona,
    agentId: userData.id || null,
    role,
    canAccessAdmin: activePersona === "admin",
    canManageYears: isOrganizer,
    canManageAuthorizations: isOrganizer,
    canManageStudents: isGestionnaire,
    canManageFiliere: isGestionnaire,
    canManageProgramme: isGestionnaire,
    canManageCharges: isTitulaire,
  };
};

/**
 * RÉCUPÉRATION DE LA SESSION (JWT)
 * Remplace l'ancien appel à supabase.auth.getUser()
 */
export const getAuthenticatedUser = async (): Promise<AuthenticatedUser | null> => {
  try {
    // 1. Récupère les données décryptées du cookie "session"
    const userData = await getUser();

    if (!userData) return null;

    // 2. Transforme en objet compatible avec l'application
    return await buildAuthenticatedUser(userData);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return null;
  }
};

/**
 * SYNCHRONISATION (Obsolète mais conservée pour compatibilité signature)
 * Dans ton nouveau système, l'utilisateur est déjà "sync" car tiré de la BDD
 */
export const syncAuthenticatedUser = async (): Promise<AuthenticatedUser | null> => {
  return await getAuthenticatedUser();
};