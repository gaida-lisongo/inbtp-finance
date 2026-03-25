"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

type PaiementFieldErrors = Partial<Record<"etudiantId" | "montant" | "orderNumber" | "status", string>>;

export type PaiementActionResult = {
  ok: boolean;
  message: string;
  errors?: PaiementFieldErrors;
  details?: string[];
};

export type PaiementBulkInput = {
  etudiantId: string;
  matricule: string;
  montant: number;
  orderNumber: string;
};

export type PaiementBulkInsertResult = {
  ok: boolean;
  message: string;
  insertedCount: number;
};

export type PaiementAssignmentResult = {
  ok: boolean;
  message: string;
  affectedCount: number;
  details?: string[];
};

const normalizeValue = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const normalizeCsvValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const normalizeMatricule = (value: string) => value.replace(/\s+/g, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENTRA_TENANT_ID = process.env.ENTRA_TENANT_ID;
const ENTRA_CLIENT_ID = process.env.ENTRA_CLIENT_ID;
const ENTRA_CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET;

const parseMontant = (value: string) => {
  if (!value) {
    return Number.NaN;
  }

  return Number(value);
};

const getSupabase = async () => {
  const cookieStore = await cookies();
  return createServerSupabaseClient(cookieStore);
};

const getSupabaseAdmin = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Configuration Supabase admin incomplete pour l'affectation des paiements.");
  }

  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const assertEntraConfig = () => {
  if (!ENTRA_TENANT_ID || !ENTRA_CLIENT_ID || !ENTRA_CLIENT_SECRET) {
    throw new Error("Configuration Entra ID incomplete pour l'affectation des paiements.");
  }
};

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

const revalidatePaiementsPage = (modaliteId: string) => {
  revalidatePath(`/paiements/${modaliteId}`);
};

const getFunctionAuthHeaders = () => {
  if (!SUPABASE_URL || (!SUPABASE_PUBLISHABLE_KEY && !SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error("Configuration Supabase incomplete pour appeler les fonctions de paiement.");
  }

  const bearerToken = SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_PUBLISHABLE_KEY!;
  const apiKey = SUPABASE_PUBLISHABLE_KEY ?? SUPABASE_SERVICE_ROLE_KEY!;

  return {
    "content-type": "application/json",
    apikey: apiKey,
    Authorization: `Bearer ${bearerToken}`,
  };
};

const validateCreatePayload = ({
  etudiantId,
  montant,
  orderNumber,
}: {
  etudiantId: string;
  montant: number;
  orderNumber: string;
}) => {
  const errors: PaiementFieldErrors = {};

  if (!etudiantId) {
    errors.etudiantId = "L'etudiant est obligatoire.";
  }

  if (!Number.isFinite(montant) || montant <= 0) {
    errors.montant = "Le montant doit etre un nombre positif.";
  }

  if (!orderNumber) {
    errors.orderNumber = "Le numero de commande est obligatoire.";
  }

  return errors;
};

const validateUpdatePayload = ({
  montant,
  orderNumber,
  status,
}: {
  montant: number;
  orderNumber: string;
  status: string;
}) => {
  const errors: PaiementFieldErrors = {};

  if (!Number.isFinite(montant) || montant <= 0) {
    errors.montant = "Le montant doit etre un nombre positif.";
  }

  if (!orderNumber) {
    errors.orderNumber = "Le numero de commande est obligatoire.";
  }

  if (!status) {
    errors.status = "Le statut est obligatoire.";
  }

  return errors;
};

const invokeCreatePaiement = async ({
  matricule,
  modaliteId,
  orderNumber,
  montant,
}: {
  matricule: string;
  modaliteId: number;
  orderNumber: string;
  montant: number;
}) => {
  const endpoint = `${SUPABASE_URL}/functions/v1/create-paiement`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: getFunctionAuthHeaders(),
    body: JSON.stringify({
      matricule,
      modalite_id: modaliteId,
      orderNumber,
      montant,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        message?: string;
        error?: string;
      }
    | null;

  if (!response.ok) {
    return {
      ok: false as const,
      message:
        payload?.message ??
        payload?.error ??
        `Echec de creation du paiement via l'edge function (${response.status}).`,
      data: payload,
    };
  }

  return {
    ok: true as const,
    message: "Paiement cree avec succes.",
    data: payload,
  };
};

const invokeUpdatePaiement = async ({
  id,
  montant,
  status,
  orderNumber,
  modaliteId,
}: {
  id: string;
  montant: number;
  status: string;
  orderNumber: string;
  modaliteId: number;
}) => {
  const endpoint = `${SUPABASE_URL}/functions/v1/update-paiement`;

  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: getFunctionAuthHeaders(),
    body: JSON.stringify({
      id,
      fields: {
        montant,
        status,
        orderNumber,
        modalite_id: modaliteId,
      },
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        message?: string;
        error?: string;
      }
    | null;

  if (!response.ok) {
    return {
      ok: false as const,
      message:
        payload?.message ??
        payload?.error ??
        `Echec de mise a jour du paiement via l'edge function (${response.status}).`,
      data: payload,
    };
  }

  return {
    ok: true as const,
    message: "Le paiement a ete mis a jour.",
    data: payload,
  };
};

const invokeDeletePaiement = async (id: string) => {
  const endpoint = `${SUPABASE_URL}/functions/v1/delete-paiement`;

  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: getFunctionAuthHeaders(),
    body: JSON.stringify({ id }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        message?: string;
        error?: string;
      }
    | null;

  if (!response.ok) {
    return {
      ok: false as const,
      message:
        payload?.message ??
        payload?.error ??
        `Echec de suppression du paiement via l'edge function (${response.status}).`,
      data: payload,
    };
  }

  return {
    ok: true as const,
    message: payload?.message ?? "Le paiement a ete supprime.",
    data: payload,
  };
};

export async function savePaiementAction(formData: FormData): Promise<PaiementActionResult> {
  const id = normalizeValue(formData.get("id"));
  const modaliteId = normalizeValue(formData.get("modaliteId"));
  const etudiantId = normalizeValue(formData.get("etudiantId"));
  const orderNumber = normalizeValue(formData.get("orderNumber"));
  const status = normalizeValue(formData.get("status"));
  const montant = parseMontant(normalizeValue(formData.get("montant")));
  const numericModaliteId = Number(modaliteId);

  if (!modaliteId || !Number.isInteger(numericModaliteId)) {
    return {
      ok: false,
      message: "Modalite de paiement invalide.",
    };
  }

  if (id) {
    const errors = validateUpdatePayload({ montant, orderNumber, status });

    if (Object.keys(errors).length > 0) {
      return {
        ok: false,
        message: "Le formulaire contient des erreurs.",
        errors,
      };
    }

    const updateResult = await invokeUpdatePaiement({
      id,
      montant,
      status,
      orderNumber,
      modaliteId: numericModaliteId,
    });

    if (!updateResult.ok) {
      return {
        ok: false,
        message: updateResult.message,
      };
    }

    revalidatePaiementsPage(modaliteId);

    return {
      ok: true,
      message: "Le paiement a ete mis a jour.",
    };
  }

  const errors = validateCreatePayload({ etudiantId, montant, orderNumber });

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "Le formulaire contient des erreurs.",
      errors,
    };
  }

  const supabase = await getSupabase();
  const { data: etudiant, error: etudiantError } = await supabase
    .from("etudiants")
    .select("id, matricule")
    .eq("id", etudiantId)
    .single();

  if (etudiantError || !etudiant?.matricule) {
    return {
      ok: false,
      message: etudiantError?.message ?? "Impossible de retrouver le matricule de l'etudiant.",
    };
  }

  const createResult = await invokeCreatePaiement({
    matricule: etudiant.matricule,
    modaliteId: numericModaliteId,
    orderNumber,
    montant,
  });

  if (!createResult.ok) {
    return {
      ok: false,
      message: createResult.message,
    };
  }

  revalidatePaiementsPage(modaliteId);

  return {
    ok: true,
    message: "Le paiement a ete cree.",
  };
}

export async function deletePaiementAction({
  id,
  modaliteId,
}: {
  id: string;
  modaliteId: string;
}): Promise<PaiementActionResult> {
  if (!id || !modaliteId) {
    return {
      ok: false,
      message: "Informations insuffisantes pour supprimer ce paiement.",
    };
  }

  const deleteResult = await invokeDeletePaiement(id);

  if (!deleteResult.ok) {
    return {
      ok: false,
      message: deleteResult.message,
    };
  }

  revalidatePaiementsPage(modaliteId);

  return {
    ok: true,
    message: "Le paiement a ete supprime.",
  };
}

export async function bulkCreatePaiementsAction(
  modaliteId: string,
  rows: PaiementBulkInput[],
): Promise<PaiementBulkInsertResult> {
  const numericModaliteId = Number(modaliteId);

  if (!modaliteId || !Number.isInteger(numericModaliteId)) {
    return {
      ok: false,
      message: "Modalite de paiement invalide.",
      insertedCount: 0,
    };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      ok: false,
      message: "Aucune ligne a inserer.",
      insertedCount: 0,
    };
  }

  let insertedCount = 0;

  for (const row of rows) {
    const matricule = normalizeCsvValue(row.matricule);
    const normalizedMatricule = normalizeMatricule(matricule);
    const orderNumber = normalizeCsvValue(row.orderNumber);
    const montant = Number(row.montant);

    if (!normalizedMatricule || !orderNumber || !Number.isFinite(montant) || montant <= 0) {
      return {
        ok: false,
        message: "Certaines lignes du lot sont invalides.",
        insertedCount,
      };
    }

    const createResult = await invokeCreatePaiement({
      matricule: normalizedMatricule,
      modaliteId: numericModaliteId,
      orderNumber,
      montant,
    });

    if (!createResult.ok) {
      return {
        ok: false,
        message: createResult.message,
        insertedCount,
      };
    }

    insertedCount += 1;
  }

  revalidatePaiementsPage(modaliteId);

  return {
    ok: true,
    message: `${insertedCount} paiement(s) ajoute(s).`,
    insertedCount,
  };
}

export async function assignPaiementsToModaliteGroupAction({
  modaliteId,
  paiementIds,
}: {
  modaliteId: string;
  paiementIds: string[];
}): Promise<PaiementAssignmentResult> {
  const normalizedModaliteId = normalizeValue(modaliteId);
  const normalizedPaiementIds = Array.from(
    new Set(
      paiementIds
        .map((id) => normalizeValue(id))
        .filter(Boolean),
    ),
  );

  if (!normalizedModaliteId || !Number.isInteger(Number(normalizedModaliteId))) {
    return {
      ok: false,
      message: "Modalite invalide pour l'affectation.",
      affectedCount: 0,
    };
  }

  if (normalizedPaiementIds.length === 0) {
    return {
      ok: false,
      message: "Aucun paiement selectionne pour l'affectation.",
      affectedCount: 0,
    };
  }

  try {
    const supabase = await getSupabase();
    const supabaseAdmin = getSupabaseAdmin();
    const numericModaliteId = Number(normalizedModaliteId);

    const [{ data: modalite, error: modaliteError }, { data: paiementsRaw, error: paiementsError }] =
      await Promise.all([
        supabase
          .from("modalites")
          .select("id, designation, groupe_id")
          .eq("id", numericModaliteId)
          .single(),
        supabase
          .from("paiements")
          .select("*, etudiants(id, nom, matricule, entraId)")
          .eq("modalite_id", numericModaliteId)
          .in("id", normalizedPaiementIds),
      ]);

    if (modaliteError) {
      return {
        ok: false,
        message: modaliteError.message,
        affectedCount: 0,
      };
    }

    if (paiementsError) {
      return {
        ok: false,
        message: paiementsError.message,
        affectedCount: 0,
      };
    }

    if (!modalite?.groupe_id) {
      return {
        ok: false,
        message: "Aucun groupe de securite n'est configure pour cette modalite.",
        affectedCount: 0,
      };
    }

    const accessToken = await getEntraAccessToken();
    const normalizedGroupId = modalite.groupe_id.trim();

    const groupResponse = await fetch(`https://graph.microsoft.com/v1.0/groups/${normalizedGroupId}?$select=id`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!groupResponse.ok) {
      const groupPayload = (await groupResponse.json().catch(() => null)) as
        | {
            error?: {
              message?: string;
            };
          }
        | null;

      return {
        ok: false,
        message:
          groupPayload?.error?.message ??
          "Le groupe de securite Entra ID configure pour cette modalite est introuvable ou inaccessible.",
        affectedCount: 0,
      };
    }

    let affectedCount = 0;
    const details: string[] = [];

    for (const paiement of ((paiementsRaw ?? []) as Array<{
      id: string;
      affection_id?: string | null;
      etudiants:
        | {
            id: string;
            nom: string | null;
            matricule: string | null;
            entraId: string | null;
          }
        | {
            id: string;
            nom: string | null;
            matricule: string | null;
            entraId: string | null;
          }[]
        | null;
    }>)) {
      const etudiant = Array.isArray(paiement.etudiants)
        ? paiement.etudiants[0] ?? null
        : paiement.etudiants;
      const etudiantLabel = etudiant?.nom ?? etudiant?.matricule ?? paiement.id;

      const existingAffectationId = paiement.affection_id ?? null;

      if (existingAffectationId) {
        details.push(`${etudiantLabel} deja affecte.`);
        continue;
      }

      if (!etudiant?.entraId) {
        details.push(`${etudiantLabel} ne dispose pas d'un identifiant Entra ID.`);
        continue;
      }

      const normalizedEntraUserId = etudiant.entraId.trim();

      const userResponse = await fetch(
        `https://graph.microsoft.com/v1.0/users/${normalizedEntraUserId}?$select=id,displayName`,
        {
          method: "GET",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      );

      if (!userResponse.ok) {
        const userPayload = (await userResponse.json().catch(() => null)) as
          | {
              error?: {
                message?: string;
              };
            }
          | null;

        details.push(
          `${etudiantLabel} : ${
            userPayload?.error?.message ?? "Utilisateur Entra ID introuvable ou inaccessible."
          }`,
        );
        continue;
      }

      const graphResponse = await fetch(
        `https://graph.microsoft.com/v1.0/groups/${normalizedGroupId}/members/$ref`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${normalizedEntraUserId}`,
          }),
          cache: "no-store",
        },
      );

      if (!graphResponse.ok) {
        const graphPayload = (await graphResponse.json().catch(() => null)) as
          | {
              error?: {
                message?: string;
                code?: string;
              };
            }
          | null;
        const graphMessage = graphPayload?.error?.message ?? "Erreur Graph inconnue.";
        const graphCode = (graphPayload?.error?.code ?? "").toLowerCase();
        const normalizedGraphMessage = graphMessage.toLowerCase();

        if (
          !normalizedGraphMessage.includes("already exist") &&
          !normalizedGraphMessage.includes("added object references already exist") &&
          !normalizedGraphMessage.includes("one or more added object references already exist") &&
          !graphCode.includes("objectconflict")
        ) {
          details.push(`${etudiantLabel} : ${graphMessage}`);
          continue;
        }
      }

      const affectationId = `${normalizedGroupId}:${normalizedEntraUserId}`;
      const updateResult = await supabaseAdmin
        .from("paiements")
        .update({ affection_id: affectationId })
        .eq("id", paiement.id);

      if (updateResult.error?.message) {
        details.push(`${etudiantLabel} : ${updateResult.error.message}`);
        continue;
      }

      affectedCount += 1;
      details.push(`${etudiantLabel} affecte au groupe de securite.`);
    }

    revalidatePaiementsPage(normalizedModaliteId);

    return {
      ok: affectedCount > 0,
      message:
        affectedCount > 0
          ? `${affectedCount} paiement(s) affecte(s) au groupe de securite.`
          : "Aucune affectation n'a pu etre realisee.",
      affectedCount,
      details,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erreur lors de l'affectation des paiements.",
      affectedCount: 0,
    };
  }
}
