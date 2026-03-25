"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

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

const normalizeValue = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const normalizeCsvValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const normalizeMatricule = (value: string) => value.replace(/\s+/g, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
