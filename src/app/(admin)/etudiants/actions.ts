"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

type EtudiantFieldErrors = Partial<Record<"nom" | "matricule" | "sexe", string>>;

export type EtudiantActionResult = {
  ok: boolean;
  message: string;
  errors?: EtudiantFieldErrors;
  details?: string[];
};

export type EtudiantBulkInput = {
  nom: string;
  matricule: string;
  sexe: string;
};

export type EtudiantBulkInsertResult = {
  ok: boolean;
  message: string;
  insertedCount: number;
};

export type EtudiantEntraProvisionInput = {
  id: string;
  nom: string;
  matricule: string;
  entraId?: string | null;
};

const EMAIL_DOMAIN = process.env.ENTRA_DEFAULT_DOMAIN ?? "inbtp.ac.cd";
const ENTRA_TENANT_ID = process.env.ENTRA_TENANT_ID;
const ENTRA_CLIENT_ID = process.env.ENTRA_CLIENT_ID;
const ENTRA_CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET;

const normalizeValue = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const normalizeCsvValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeMatricule = (value: string) => value.replace(/\s+/g, "");

const removeDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const buildStudentEmail = (nom: string, matricule: string) => {
  const normalizedName = removeDiacritics(nom)
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .trim();

  const firstName = normalizedName.split(/\s+/).filter(Boolean)[0] ?? "etudiant";
  const sanitizedMatricule = normalizeMatricule(matricule).toLowerCase();

  return `${firstName}.${sanitizedMatricule}@${EMAIL_DOMAIN}`;
};

const getReadableDatabaseError = (message: string) => {
  if (message.includes("row-level security policy")) {
    return "Operation refusee par les regles de securite Supabase sur la table etudiants.";
  }

  return message;
};

const getReadableEntraError = (message: string) => {
  if (message.toLowerCase().includes("already exists")) {
    return "Un compte Entra ID existe deja avec cet identifiant.";
  }

  return message;
};

const validateEtudiantPayload = ({
  nom,
  matricule,
  sexe,
}: {
  nom: string;
  matricule: string;
  sexe: string;
}) => {
  const errors: EtudiantFieldErrors = {};

  if (!nom) {
    errors.nom = "Le nom est obligatoire.";
  }

  if (!matricule) {
    errors.matricule = "Le matricule est obligatoire.";
  }

  if (!sexe) {
    errors.sexe = "Le sexe est obligatoire.";
  }

  return errors;
};

const getSupabase = async () => {
  const cookieStore = await cookies();
  return createServerSupabaseClient(cookieStore);
};

const revalidateEtudiantsPage = () => {
  revalidatePath("/etudiants");
};

const assertEntraConfig = () => {
  if (!ENTRA_TENANT_ID || !ENTRA_CLIENT_ID || !ENTRA_CLIENT_SECRET || !EMAIL_DOMAIN) {
    throw new Error("Configuration Entra ID incomplete dans les variables d'environnement.");
  }
};

const buildMailNickname = (nom: string, matricule: string) =>
  removeDiacritics(`${nom.split(/\s+/)[0] ?? "etudiant"}.${normalizeMatricule(matricule)}`)
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "");

const getEntraAccessToken = async () => {
  assertEntraConfig();

  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: ENTRA_CLIENT_ID!,
        client_secret: ENTRA_CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    },
  );

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    error_description?: string;
  };

  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description ?? "Impossible d'obtenir un jeton Microsoft Graph.");
  }

  return tokenPayload.access_token;
};

const provisionEtudiantInEntra = async ({
  id,
  nom,
  matricule,
  entraId,
}: EtudiantEntraProvisionInput): Promise<EtudiantActionResult> => {
  const normalizedId = normalizeCsvValue(id);
  const normalizedNom = normalizeCsvValue(nom);
  const normalizedMatricule = normalizeMatricule(normalizeCsvValue(matricule));

  if (!normalizedId || !normalizedNom || !normalizedMatricule) {
    return {
      ok: false,
      message: "Identifiant, nom ou matricule invalide pour la creation Entra ID.",
    };
  }

  if (entraId) {
    return {
      ok: false,
      message: "Cet etudiant possede deja un identifiant Entra ID.",
      details: [`entraId : ${entraId}`],
    };
  }

  const userPrincipalName = buildStudentEmail(normalizedNom, normalizedMatricule);
  const temporaryPassword = normalizedMatricule;
  const accessToken = await getEntraAccessToken();
  const graphResponse = await fetch("https://graph.microsoft.com/v1.0/users", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      accountEnabled: true,
      displayName: normalizedNom,
      mailNickname: buildMailNickname(normalizedNom, normalizedMatricule),
      userPrincipalName,
      passwordPolicies: "DisablePasswordExpiration",
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: temporaryPassword,
      },
    }),
    cache: "no-store",
  });

  const graphPayload = (await graphResponse.json()) as {
    id?: string;
    error?: {
      message?: string;
    };
  };

  if (!graphResponse.ok || !graphPayload.id) {
    return {
      ok: false,
      message: getReadableEntraError(
        graphPayload.error?.message ?? "Echec de creation de l'utilisateur dans Entra ID.",
      ),
    };
  }

  const supabase = await getSupabase();
  const { error: updateError } = await supabase
    .from("etudiants")
    .update({ entraId: graphPayload.id })
    .eq("id", normalizedId);

  if (updateError) {
    return {
      ok: false,
      message: getReadableDatabaseError(updateError.message),
    };
  }

  return {
    ok: true,
    message: "Utilisateur Entra ID cree avec succes.",
    details: [
      `UPN : ${userPrincipalName}`,
      `Mot de passe initial : ${temporaryPassword}`,
      `entraId : ${graphPayload.id}`,
    ],
  };
};

const deleteEtudiantFromEntra = async (entraId: string) => {
  const normalizedEntraId = normalizeCsvValue(entraId);

  if (!normalizedEntraId) {
    return { ok: true as const };
  }

  const accessToken = await getEntraAccessToken();
  const graphResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${normalizedEntraId}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (graphResponse.ok || graphResponse.status === 404) {
    return { ok: true as const };
  }

  const payload = (await graphResponse.json()) as {
    error?: {
      message?: string;
    };
  };

  return {
    ok: false as const,
    message: getReadableEntraError(
      payload.error?.message ?? "Echec de suppression du compte Entra ID.",
    ),
  };
};

export async function saveEtudiantAction(formData: FormData): Promise<EtudiantActionResult> {
  const id = normalizeValue(formData.get("id"));
  const nom = normalizeValue(formData.get("nom"));
  const matricule = normalizeMatricule(normalizeValue(formData.get("matricule")));
  const sexe = normalizeValue(formData.get("sexe"));

  const errors = validateEtudiantPayload({ nom, matricule, sexe });

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "Le formulaire contient des erreurs.",
      errors,
    };
  }

  const payload = {
    nom,
    matricule,
    sexe,
    email: buildStudentEmail(nom, matricule),
  };

  const supabase = await getSupabase();
  const query = id
    ? supabase.from("etudiants").update(payload).eq("id", id)
    : supabase.from("etudiants").insert(payload);

  const { error } = await query;

  if (error) {
    return {
      ok: false,
      message: getReadableDatabaseError(error.message),
    };
  }

  revalidateEtudiantsPage();

  return {
    ok: true,
    message: id ? "L'etudiant a ete mis a jour." : "L'etudiant a ete cree.",
  };
}

export async function deleteEtudiantAction({
  id,
  entraId,
}: {
  id: string;
  entraId?: string | null;
}): Promise<EtudiantActionResult> {
  if (!id) {
    return {
      ok: false,
      message: "Identifiant de l'etudiant manquant.",
    };
  }

  if (entraId) {
    try {
      const entraDeletion = await deleteEtudiantFromEntra(entraId);

      if (!entraDeletion.ok) {
        return {
          ok: false,
          message: entraDeletion.message,
        };
      }
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Erreur inconnue lors de la suppression du compte Entra ID.",
      };
    }
  }

  const supabase = await getSupabase();
  const { error } = await supabase.from("etudiants").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: getReadableDatabaseError(error.message),
    };
  }

  revalidateEtudiantsPage();

  return {
    ok: true,
    message: "L'etudiant a ete supprime.",
  };
}

export async function createEtudiantEntraUserAction({
  id,
  nom,
  matricule,
  entraId,
}: {
  id: string;
  nom: string;
  matricule: string;
  entraId?: string | null;
}): Promise<EtudiantActionResult> {
  try {
    const result = await provisionEtudiantInEntra({ id, nom, matricule, entraId });
    revalidateEtudiantsPage();
    return result;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erreur inconnue lors de la creation Entra ID.",
    };
  }
}

export async function bulkCreateEtudiantsEntraUsersAction(
  etudiants: EtudiantEntraProvisionInput[],
): Promise<EtudiantActionResult> {
  if (!Array.isArray(etudiants) || etudiants.length === 0) {
    return {
      ok: false,
      message: "Aucun etudiant selectionne pour le provisioning Entra ID.",
    };
  }

  let successCount = 0;
  const details: string[] = [];

  for (const etudiant of etudiants) {
    const result = await provisionEtudiantInEntra(etudiant);

    if (result.ok) {
      successCount += 1;
      details.push(`${etudiant.nom} : cree`);
    } else {
      details.push(`${etudiant.nom} : ${result.message}`);
    }
  }

  revalidateEtudiantsPage();

  return {
    ok: successCount > 0,
    message:
      successCount === etudiants.length
        ? `${successCount} etudiant(s) provisionne(s) dans Entra ID.`
        : `${successCount}/${etudiants.length} etudiant(s) provisionne(s) dans Entra ID.`,
    details,
  };
}

export async function bulkInsertEtudiantsAction(
  rows: EtudiantBulkInput[],
): Promise<EtudiantBulkInsertResult> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      ok: false,
      message: "Aucune ligne a inserer.",
      insertedCount: 0,
    };
  }

  const payload = rows.map((row) => {
    const nom = normalizeCsvValue(row.nom);
    const matricule = normalizeMatricule(normalizeCsvValue(row.matricule));
    const sexe = normalizeCsvValue(row.sexe);

    return {
      nom,
      matricule,
      sexe,
      email: buildStudentEmail(nom, matricule),
    };
  });

  const invalidRow = payload.find((row) => !row.nom || !row.matricule || !row.sexe);

  if (invalidRow) {
    return {
      ok: false,
      message: "Certaines lignes du lot sont invalides.",
      insertedCount: 0,
    };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.from("etudiants").insert(payload);

  if (error) {
    return {
      ok: false,
      message: getReadableDatabaseError(error.message),
      insertedCount: 0,
    };
  }

  revalidateEtudiantsPage();

  return {
    ok: true,
    message: `${payload.length} etudiant(s) ajoute(s).`,
    insertedCount: payload.length,
  };
}

export { buildStudentEmail, normalizeMatricule };
