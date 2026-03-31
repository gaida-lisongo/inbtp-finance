import { cookies } from "next/headers";
import { type User } from "@supabase/supabase-js";

import { findAgentRecordForUser, normalizeAgentRole, type AccountType, type AgentRole } from "@/lib/utils/supabase/agents";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";
import { attachStudentUserByEmail } from "@/lib/utils/supabase/students";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  accountType: AccountType;
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

const getIdentityMetadata = (user: User) => {
  const firstIdentity = user.identities?.[0];
  return typeof firstIdentity?.identity_data === "object" && firstIdentity.identity_data
    ? firstIdentity.identity_data
    : null;
};

const getUserName = (user: User) => {
  const metadata = user.user_metadata ?? {};
  const identityMetadata = getIdentityMetadata(user);

  const fullName =
    metadata.full_name ??
    metadata.name ??
    identityMetadata?.full_name ??
    identityMetadata?.name ??
    identityMetadata?.display_name;

  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  if (user.email) {
    return user.email;
  }

  return "Utilisateur";
};

const getAvatarUrl = (user: User) => {
  const metadata = user.user_metadata ?? {};
  const identityMetadata = getIdentityMetadata(user);
  const avatarUrl = metadata.avatar_url ?? identityMetadata?.avatar_url ?? identityMetadata?.picture;

  return typeof avatarUrl === "string" && avatarUrl.length > 0 ? avatarUrl : null;
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

const resolveAvatarUrl = async (avatarUrl: string | null) => {
  if (!avatarUrl) {
    return null;
  }

  if (!supabaseBucket || (isAbsoluteUrl(avatarUrl) && !avatarUrl.includes("/storage/v1/object/"))) {
    return avatarUrl;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(supabaseBucket)
    .createSignedUrl(extractStoragePath(avatarUrl), signedUrlExpiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
};

const buildAuthenticatedUser = async (user: User): Promise<AuthenticatedUser | null> => {
  if (!user.email) {
    return null;
  }

  const agentRecord = await findAgentRecordForUser(user);
  const accountType: AccountType = agentRecord ? "agent" : "student";
  const role = normalizeAgentRole(agentRecord?.role);
  const isOrganizer = role === "organisateur";
  const isGestionnaire = role === "gestionnaire";
  const isTitulaire = role === "titulaire";

  return {
    id: user.id,
    email: user.email,
    name: getUserName(user),
    avatarUrl: await resolveAvatarUrl(getAvatarUrl(user)),
    accountType,
    agentId: agentRecord?.id ?? null,
    role,
    canAccessAdmin: Boolean(agentRecord && role),
    canManageYears: isOrganizer,
    canManageAuthorizations: isOrganizer,
    canManageStudents: isGestionnaire,
    canManageFiliere: isGestionnaire,
    canManageProgramme: isGestionnaire,
    canManageCharges: isTitulaire,
  };
};

export const getAuthenticatedUser = async (): Promise<AuthenticatedUser | null> => {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return null;
  }

  const authenticatedUser = await buildAuthenticatedUser(user);
  return authenticatedUser;
};

export const syncAuthenticatedUser = async (): Promise<AuthenticatedUser | null> => {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return null;
  }

  const agentRecord = await findAgentRecordForUser(user);

  if (!agentRecord && user.email) {
    await attachStudentUserByEmail(user.email, user.id);
  }

  const authenticatedUser = await buildAuthenticatedUser(user);
  const storedAvatarUrl = getAvatarUrl(user);

  if (!authenticatedUser) {
    return null;
  }

  const metadata = {
    email: authenticatedUser.email,
    full_name: authenticatedUser.name,
    avatar_url: storedAvatarUrl,
    last_sign_in_at: new Date().toISOString(),
  };

  const hasMissingMetadata =
    user.user_metadata?.email !== authenticatedUser.email ||
    user.user_metadata?.full_name !== authenticatedUser.name ||
    user.user_metadata?.avatar_url !== storedAvatarUrl;

  if (hasMissingMetadata) {
    await supabase.auth.updateUser({
      data: metadata,
    });
  }

  return authenticatedUser;
};
