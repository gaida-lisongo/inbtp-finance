'use server'

import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { type AgentRecord, AgentProfile } from "./agents-shared";


// --- Configuration & Constantes Internes (Non exportées) ---

const supabaseBucket = process.env.SUPABASE_BUCKET;
const signedUrlExpiresInSeconds = 60 * 60;

// --- Helpers Internes (Non exportés) ---

const emptyToNull = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const buildDisplayName = (agent: Pick<AgentRecord, "prenom" | "post_nom" | "nom">, email: string) => {
  const name = [agent.prenom, agent.post_nom, agent.nom].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : email;
};

const mapAgentProfile = async (agent: AgentRecord, email: string): Promise<AgentProfile> => {
  const newAgent = {
    ...agent,
    email,
    displayName: buildDisplayName(agent, email),
    photoUrl: await resolvePhotoUrl(agent.photo),
    avatarUrl: await resolvePhotoUrl(agent.photo),
  };
  return newAgent;
};

// --- Server Actions Exportées (Toutes obligatoirement ASYNC) ---

export async function getCurrentAgentAccess() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("access_denied");

  return {
    accountType: user.accountType,
    role: user.role,
    canAccessAdmin: user.canAccessAdmin,
    canManageYears: user.canManageYears,
    canManageAuthorizations: user.canManageAuthorizations,
    canManageStudents: user.canManageStudents,
    canManageFiliere: user.canManageFiliere,
    canManageProgramme: user.canManageProgramme,
    canManageCharges: user.canManageCharges,
  };
}

export async function getCurrentAgentProfile() {
  const user = await getAuthenticatedUser();
  if (!user || user.accountType !== "agent") return null;

  const admin = createAdminClient();
  const { data: agent } = await admin.from("agents").select("*").eq("id", user.agentId).maybeSingle();
  
  if (!agent) return null;
  return mapAgentProfile(agent, user.email);
}

export async function updateCurrentAgentProfile(formData: FormData) {
  const user = await getAuthenticatedUser();
  if (!user || !user.agentId) throw new Error("access_denied");

  const admin = createAdminClient();
  const { data: currentAgent } = await admin.from("agents").select("photo").eq("id", user.agentId).single();

  let photoPath = currentAgent?.photo;
  const uploadedPhoto = formData.get("photo");

  if (uploadedPhoto instanceof File && uploadedPhoto.size > 0) {
    const arrayBuffer = await uploadedPhoto.arrayBuffer();
    const extension = uploadedPhoto.name.split(".").pop() || "bin";
    photoPath = `agents/${user.id}/profile-${Date.now()}.${extension}`;
    
    await admin.storage.from(supabaseBucket!).upload(photoPath, arrayBuffer, {
      contentType: uploadedPhoto.type,
      upsert: true,
    });
  }

  const updates = {
    grade: emptyToNull(formData.get("grade")),
    photo: photoPath,
    nom: emptyToNull(formData.get("nom")),
    post_nom: emptyToNull(formData.get("post_nom")),
    prenom: emptyToNull(formData.get("prenom")),
    telephone: emptyToNull(formData.get("telephone")),
    bio: emptyToNull(formData.get("bio")),
    facebook: emptyToNull(formData.get("facebook")),
    x: emptyToNull(formData.get("x")),
    twitter: emptyToNull(formData.get("twitter")),
    pays: emptyToNull(formData.get("pays")),
    ville: emptyToNull(formData.get("ville")),
    adresse: emptyToNull(formData.get("adresse")),
    commune: emptyToNull(formData.get("commune")),
  };

  const { data, error } = await admin
    .from("agents")
    .update(updates)
    .eq("id", user.agentId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return mapAgentProfile(data as AgentRecord, user.email);
}

export async function getAllAgents(): Promise<AgentRecord[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("agents").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAgent(agentData: any): Promise<AgentRecord> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("agents").insert(agentData).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateAgent(id: string, updates: Partial<AgentRecord>): Promise<AgentRecord> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("agents").update(updates).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAgent(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("agents").delete().eq("id", id);
  if (error) throw new Error(error.message);
}