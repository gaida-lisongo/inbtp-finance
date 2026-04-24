import "server-only";

import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { normalizeAgentRole, type AgentRecord, type AgentRole } from "@/lib/utils/supabase/agents-shared";

export type AgentAccess = {
  canAccessAdmin: boolean;
  canManageAdmin: boolean;
  canManageStudents: boolean;
  canManageCharges: boolean;
  canManageYears: boolean;
  canManageAuthorizations: boolean;
  canManageFiliere: boolean;
  canManageProgramme: boolean;
};

export const getCurrentAccountType = async () => {
  const user = await getAuthenticatedUser();
  return user?.accountType ?? null;
};

export const getCurrentAgentAccess = async (): Promise<AgentAccess> => {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("auth_required");
  }

  return {
    canAccessAdmin: user.canAccessAdmin,
    canManageAdmin: user.canManageAdmin,
    canManageStudents: user.canManageStudents,
    canManageCharges: user.canManageCharges,
    canManageYears: user.canManageYears,
    canManageAuthorizations: user.canManageAuthorizations,
    canManageFiliere: user.canManageFiliere,
    canManageProgramme: user.canManageProgramme,
  };
};

const assertCanManageAgents = async () => {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "organisateur") {
    throw new Error("access_denied");
  }
};

export const getAllAgents = async (): Promise<AgentRecord[]> => {
  await assertCanManageAgents();

  const admin = createAdminClient();
  const { data, error } = await admin.from("agents").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AgentRecord[];
};

export const createAgent = async (input: {
  nom: string;
  post_nom?: string | null;
  prenom: string;
  email: string;
  grade?: string | null;
  role?: AgentRole | string | null;
}): Promise<AgentRecord> => {
  await assertCanManageAgents();

  const role = normalizeAgentRole(input.role) ?? "titulaire";
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agents")
    .insert({
      nom: input.nom,
      post_nom: input.post_nom ?? null,
      prenom: input.prenom,
      email: input.email,
      grade: input.grade ?? null,
      role,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AgentRecord;
};

export const updateAgent = async (
  id: string,
  updates: Partial<{
    nom: string;
    post_nom: string | null;
    prenom: string;
    email: string;
    grade: string | null;
    role: AgentRole | string | null;
  }>,
): Promise<AgentRecord> => {
  await assertCanManageAgents();

  const payload: Record<string, unknown> = { ...updates };
  if ("role" in updates) {
    payload.role = normalizeAgentRole(updates.role) ?? "titulaire";
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("agents").update(payload).eq("id", id).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AgentRecord;
};

export const deleteAgent = async (id: string) => {
  await assertCanManageAgents();

  const admin = createAdminClient();
  const { error } = await admin.from("agents").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};

