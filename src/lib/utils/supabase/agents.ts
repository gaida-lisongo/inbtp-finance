import { cookies } from "next/headers";
import { type User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/utils/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

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
};

export type AgentProfile = AgentRecord & {
  email: string;
  displayName: string;
  photoUrl: string | null;
};

const supabaseBucket = process.env.SUPABASE_BUCKET;
const signedUrlExpiresInSeconds = 60 * 60;

const emptyToNull = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const getIdentityData = (user: User) => {
  const identity = user.identities?.[0];
  return typeof identity?.identity_data === "object" && identity.identity_data ? identity.identity_data : null;
};

const getEntraId = (user: User) => {
  const identityData = getIdentityData(user);
  const entraId =
    identityData?.sub ??
    identityData?.oid ??
    identityData?.user_id ??
    user.app_metadata?.provider_id;

  return typeof entraId === "string" && entraId.length > 0 ? entraId : null;
};

const splitUserName = (user: User) => {
  const identityData = getIdentityData(user);
  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    identityData?.full_name ??
    identityData?.name;

  if (typeof fullName !== "string" || fullName.trim().length === 0) {
    return {
      prenom: null,
      nom: null,
      post_nom: null,
    };
  }

  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    prenom: parts[0] ?? null,
    nom: parts.length > 1 ? parts[parts.length - 1] : null,
    post_nom: parts.length > 2 ? parts.slice(1, -1).join(" ") : null,
  };
};

const buildDisplayName = (agent: Pick<AgentRecord, "prenom" | "post_nom" | "nom">, email: string) => {
  const name = [agent.prenom, agent.post_nom, agent.nom].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : email;
};

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const extractStoragePath = (value: string) => {
  if (!supabaseBucket || !isAbsoluteUrl(value)) {
    return value;
  }

  const publicSegment = `/storage/v1/object/public/${supabaseBucket}/`;
  const signSegment = `/storage/v1/object/sign/${supabaseBucket}/`;

  if (value.includes(publicSegment)) {
    return value.split(publicSegment)[1]?.split("?")[0] ?? value;
  }

  if (value.includes(signSegment)) {
    return value.split(signSegment)[1]?.split("?")[0] ?? value;
  }

  return value;
};

const resolvePhotoUrl = async (photo: string | null) => {
  if (!photo) {
    return null;
  }

  if (!supabaseBucket || isAbsoluteUrl(photo) && !photo.includes(`/storage/v1/object/`)) {
    return photo;
  }

  const photoPath = extractStoragePath(photo);
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(supabaseBucket)
    .createSignedUrl(photoPath, signedUrlExpiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
};

const mapAgentProfile = async (agent: AgentRecord, email: string): Promise<AgentProfile> => ({
  ...agent,
  email,
  displayName: buildDisplayName(agent, email),
  photoUrl: await resolvePhotoUrl(agent.photo),
});

const getCurrentAuthUser = async () => {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user || !data.user.email) {
    throw new Error("No authenticated user found.");
  }

  return data.user;
};

const getAgentByUserId = async (userId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as AgentRecord | null;
};

export const ensureCurrentAgentProfile = async () => {
  const user = await getCurrentAuthUser();
  const existingAgent = await getAgentByUserId(user.id);

  if (existingAgent) {
    return mapAgentProfile(existingAgent, user.email!);
  }

  const admin = createAdminClient();
  const defaultNames = splitUserName(user);
  const initialPhoto =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  const { data, error } = await admin
    .from("agents")
    .insert({
      user_id: user.id,
      prenom: defaultNames.prenom,
      nom: defaultNames.nom,
      post_nom: defaultNames.post_nom,
      photo: initialPhoto,
      entra_id: getEntraId(user),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAgentProfile(data as AgentRecord, user.email!);
};

export const getCurrentAgentProfile = async () => {
  return ensureCurrentAgentProfile();
};

export const uploadAgentPhoto = async (userId: string, file: File) => {
  if (!supabaseBucket) {
    throw new Error("SUPABASE_BUCKET is not configured.");
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const safeExtension = typeof extension === "string" ? extension.toLowerCase() : "bin";
  const filePath = `agents/${userId}/profile-${Date.now()}.${safeExtension}`;
  const admin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await admin.storage.from(supabaseBucket).upload(filePath, arrayBuffer, {
    contentType: file.type || undefined,
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return filePath;
};

export const updateCurrentAgentProfile = async (formData: FormData) => {
  const user = await getCurrentAuthUser();
  const agent = await ensureCurrentAgentProfile();

  let photoPath = agent.photo;
  const uploadedPhoto = formData.get("photo");

  if (uploadedPhoto instanceof File && uploadedPhoto.size > 0) {
    photoPath = await uploadAgentPhoto(user.id, uploadedPhoto);
  }

  const updates = {
    grade: emptyToNull(formData.get("grade")),
    photo: photoPath,
    role: emptyToNull(formData.get("role")),
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
    entra_id: emptyToNull(formData.get("entra_id")) ?? agent.entra_id,
  };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agents")
    .update(updates)
    .eq("id", agent.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const fullName = [updates.prenom, updates.post_nom, updates.nom].filter(Boolean).join(" ").trim();
  const metadata: Record<string, string | null> = {
    full_name: fullName.length > 0 ? fullName : user.email!,
    avatar_url: photoPath,
  };

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  await supabase.auth.updateUser({
    data: metadata,
  });

  return mapAgentProfile(data as AgentRecord, user.email!);
};
