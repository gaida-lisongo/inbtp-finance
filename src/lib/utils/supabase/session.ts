import "server-only";

import Authentication from "@/lib/user/Authentication";

export type AccountType = "organisateur" | "gestionnaire" | "student" | "titulaire";
export type ActivePersona = "admin" | "teacher" | "student";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  role: Exclude<AccountType, "student"> | null;
  accountType: AccountType;
  activePersona: ActivePersona;
  agentId: string | null;
  studentId: string | null;

  canAccessAdmin: boolean;
  canManageAdmin: boolean;
  canManageStudents: boolean;
  canManageCharges: boolean;
  canManageYears: boolean;
  canManageAuthorizations: boolean;
  canManageFiliere: boolean;
  canManageProgramme: boolean;

  photo?: string | null;
  nom?: string | null;
  prenom?: string | null;
  post_nom?: string | null;
  telephone?: string | null;
  grade?: string | null;
  sexe?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  date_naissance?: string | null;
  pays?: string | null;
  ville?: string | null;
  commune?: string | null;
  adresse?: string | null;
};

const allowedAccountTypes = new Set<AccountType>(["organisateur", "gestionnaire", "student", "titulaire"]);

const normalizeAccountType = (value: unknown): AccountType => {
  if (typeof value !== "string") {
    return "student";
  }

  const normalized = value.trim().toLowerCase();
  return allowedAccountTypes.has(normalized as AccountType) ? (normalized as AccountType) : "student";
};

const buildPermissions = (accountType: AccountType) => {
  const isStudent = accountType === "student";
  const isOrganisateur = accountType === "organisateur";
  const isGestionnaire = accountType === "gestionnaire";
  const isTitulaire = accountType === "titulaire";

  return {
    canAccessAdmin: !isStudent,
    canManageAdmin: !isStudent,
    canManageYears: isOrganisateur,
    canManageAuthorizations: isOrganisateur,
    canManageStudents: isGestionnaire,
    canManageFiliere: isGestionnaire,
    canManageProgramme: isGestionnaire,
    canManageCharges: isTitulaire,
  };
};

const buildActivePersona = (accountType: AccountType): ActivePersona => {
  if (accountType === "student") return "student";
  if (accountType === "titulaire") return "teacher";
  return "admin";
};

const normalizeUserRecord = (raw: unknown): AuthenticatedUser | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  if (!id) {
    return null;
  }

  const email = typeof record.email === "string" ? record.email : null;
  const accountType = normalizeAccountType(record.role);
  const activePersona = buildActivePersona(accountType);
  const permissions = buildPermissions(accountType);

  const role = accountType === "student" ? null : (accountType as Exclude<AccountType, "student">);

  return {
    id,
    email,
    role,
    accountType,
    activePersona,
    agentId: accountType === "student" ? null : id,
    studentId: accountType === "student" ? id : null,
    ...permissions,

    photo: typeof record.photo === "string" ? record.photo : null,
    nom: typeof record.nom === "string" ? record.nom : null,
    prenom: typeof record.prenom === "string" ? record.prenom : null,
    post_nom: typeof record.post_nom === "string" ? record.post_nom : null,
    telephone: typeof record.telephone === "string" ? record.telephone : null,
    grade: typeof record.grade === "string" ? record.grade : null,
    sexe: typeof record.sexe === "string" ? record.sexe : null,
    twitter: typeof record.twitter === "string" ? record.twitter : null,
    facebook: typeof record.facebook === "string" ? record.facebook : null,
    date_naissance: typeof record.date_naissance === "string" ? record.date_naissance : null,
    pays: typeof record.pays === "string" ? record.pays : null,
    ville: typeof record.ville === "string" ? record.ville : null,
    commune: typeof record.commune === "string" ? record.commune : null,
    adresse: typeof record.adresse === "string" ? record.adresse : null,
  };
};

const auth = new Authentication();

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const raw = await auth.getCurrentUser();
  return normalizeUserRecord(raw);
}

export async function syncAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  return getAuthenticatedUser();
}

