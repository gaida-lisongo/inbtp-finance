"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

type ModaliteFieldErrors = Partial<Record<"designation" | "slug" | "montant" | "status" | "fraisId", string>>;

export type ModaliteActionResult = {
  ok: boolean;
  message: string;
  errors?: ModaliteFieldErrors;
  details?: string[];
};

export type ModaliteBulkInput = {
  designation: string;
  slug: string;
  montant: number;
  description: string;
  status: string;
  fraisId: string;
};

export type ModaliteBulkInsertResult = {
  ok: boolean;
  message: string;
  insertedCount: number;
};

const normalizeValue = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const normalizeCsvValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeMultilineText = (value: string) => value.replace(/\\n/g, "\n").trim();
const ENTRA_TENANT_ID = process.env.ENTRA_TENANT_ID;
const ENTRA_CLIENT_ID = process.env.ENTRA_CLIENT_ID;
const ENTRA_CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET;

const parseMontant = (value: string) => {
  if (!value) {
    return Number.NaN;
  }

  return Number(value);
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const removeDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const buildGroupMailNickname = (slug: string, id: string) => {
  const normalized = removeDiacritics(`${slug}-${id}`)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return normalized || `modalite${id}`;
};

const assertEntraConfig = () => {
  if (!ENTRA_TENANT_ID || !ENTRA_CLIENT_ID || !ENTRA_CLIENT_SECRET) {
    throw new Error("Configuration Entra ID incomplete dans les variables d'environnement.");
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

const validateModalitePayload = ({
  designation,
  slug,
  montant,
  status,
  fraisId,
}: {
  designation: string;
  slug: string;
  montant: number;
  status: string;
  fraisId: string;
}) => {
  const errors: ModaliteFieldErrors = {};

  if (!designation) {
    errors.designation = "La designation est obligatoire.";
  }

  if (!slug) {
    errors.slug = "Le slug est obligatoire.";
  }

  if (!Number.isFinite(montant) || montant < 0) {
    errors.montant = "Le montant doit etre un nombre positif.";
  }

  if (!status) {
    errors.status = "Le statut est obligatoire.";
  }

  if (!fraisId) {
    errors.fraisId = "Le frais associe est obligatoire.";
  }

  return errors;
};

const getSupabase = async () => {
  const cookieStore = await cookies();
  return createServerSupabaseClient(cookieStore);
};

const revalidateModalitesPage = (promotionId: string, anneeId: string) => {
  revalidatePath(`/promotion/${promotionId}/${anneeId}`);
};

export async function saveModaliteAction(formData: FormData): Promise<ModaliteActionResult> {
  const id = normalizeValue(formData.get("id"));
  const promotionId = normalizeValue(formData.get("promotionId"));
  const anneeId = normalizeValue(formData.get("anneeId"));
  const designation = normalizeValue(formData.get("designation"));
  const description = normalizeMultilineText(normalizeValue(formData.get("description")));
  const status = normalizeValue(formData.get("status"));
  const fraisId = normalizeValue(formData.get("fraisId"));
  const montant = parseMontant(normalizeValue(formData.get("montant")));
  const rawSlug = normalizeValue(formData.get("slug"));
  const slug = rawSlug || slugify(designation);

  if (!promotionId || !anneeId) {
    return {
      ok: false,
      message: "Contexte de promotion ou d'annee manquant.",
    };
  }

  const errors = validateModalitePayload({
    designation,
    slug,
    montant,
    status,
    fraisId,
  });

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "Le formulaire contient des erreurs.",
      errors,
    };
  }

  const payload = {
    designation,
    slug,
    montant,
    description: description || null,
    status,
    annee_id: anneeId,
    frais_id: fraisId,
  };

  const supabase = await getSupabase();
  const query = id
    ? supabase.from("modalites").update(payload).eq("id", id)
    : supabase.from("modalites").insert(payload);

  const { error } = await query;

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateModalitesPage(promotionId, anneeId);

  return {
    ok: true,
    message: id ? "La modalite a ete mise a jour." : "La modalite a ete creee.",
  };
}

export async function deleteModaliteAction({
  id,
  promotionId,
  anneeId,
}: {
  id: string;
  promotionId: string;
  anneeId: string;
}): Promise<ModaliteActionResult> {
  if (!id || !promotionId || !anneeId) {
    return {
      ok: false,
      message: "Informations insuffisantes pour supprimer cette modalite.",
    };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.from("modalites").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateModalitesPage(promotionId, anneeId);

  return {
    ok: true,
    message: "La modalite a ete supprimee.",
  };
}

export async function bulkInsertModalitesAction(
  promotionId: string,
  anneeId: string,
  rows: ModaliteBulkInput[],
): Promise<ModaliteBulkInsertResult> {
  if (!promotionId || !anneeId) {
    return {
      ok: false,
      message: "Contexte de promotion ou d'annee manquant.",
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

  const payload = rows.map((row) => {
    const designation = normalizeCsvValue(row.designation);
    const slug = normalizeCsvValue(row.slug) || slugify(designation);
    const montant = Number(row.montant);
    const description = normalizeMultilineText(normalizeCsvValue(row.description));
    const status = normalizeCsvValue(row.status);
    const fraisId = normalizeCsvValue(row.fraisId);

    return {
      designation,
      slug,
      montant,
      description: description || null,
      status,
      annee_id: anneeId,
      frais_id: fraisId,
    };
  });

  const invalidRow = payload.find(
    (row) =>
      !row.designation ||
      !row.slug ||
      !row.status ||
      !row.frais_id ||
      !Number.isFinite(row.montant) ||
      row.montant < 0,
  );

  if (invalidRow) {
    return {
      ok: false,
      message: "Certaines lignes du lot sont invalides.",
      insertedCount: 0,
    };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.from("modalites").insert(payload);

  if (error) {
    return {
      ok: false,
      message: error.message,
      insertedCount: 0,
    };
  }

  revalidateModalitesPage(promotionId, anneeId);

  return {
    ok: true,
    message: `${payload.length} modalite(s) ajoutee(s).`,
    insertedCount: payload.length,
  };
}

export async function createModaliteEntraGroupAction({
  id,
  promotionId,
  anneeId,
  designation,
  slug,
  groupeId,
}: {
  id: string;
  promotionId: string;
  anneeId: string;
  designation: string;
  slug: string;
  groupeId?: string | null;
}): Promise<ModaliteActionResult> {
  const normalizedId = normalizeCsvValue(id);
  const normalizedPromotionId = normalizeCsvValue(promotionId);
  const normalizedAnneeId = normalizeCsvValue(anneeId);
  const normalizedDesignation = normalizeCsvValue(designation);
  const normalizedSlug = normalizeCsvValue(slug) || slugify(normalizedDesignation);

  if (!normalizedId || !normalizedPromotionId || !normalizedAnneeId) {
    return {
      ok: false,
      message: "Contexte de modalite incomplet pour la creation du groupe.",
    };
  }

  if (!normalizedDesignation || !normalizedSlug) {
    return {
      ok: false,
      message: "La designation ou le slug de la modalite est invalide.",
    };
  }

  if (groupeId) {
    return {
      ok: false,
      message: "Le groupe Entra ID existe deja pour cette modalite.",
      details: [`groupe_id : ${groupeId}`],
    };
  }

  try {
    const accessToken = await getEntraAccessToken();
    const graphResponse = await fetch("https://graph.microsoft.com/v1.0/groups", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        displayName: normalizedDesignation,
        description: `Groupe de securite pour la modalite ${normalizedDesignation}`,
        mailEnabled: false,
        mailNickname: buildGroupMailNickname(normalizedSlug, normalizedId),
        securityEnabled: true,
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
        message:
          graphPayload.error?.message ?? "Echec de creation du groupe de securite dans Entra ID.",
      };
    }

    const supabase = await getSupabase();
    const { error: updateError } = await supabase
      .from("modalites")
      .update({ groupe_id: graphPayload.id })
      .eq("id", normalizedId);

    if (updateError) {
      return {
        ok: false,
        message: updateError.message,
      };
    }

    revalidateModalitesPage(normalizedPromotionId, normalizedAnneeId);

    return {
      ok: true,
      message: "Le groupe de securite Entra ID a ete cree avec succes.",
      details: [
        `slug : ${normalizedSlug}`,
        `groupe_id : ${graphPayload.id}`,
      ],
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de la creation du groupe Entra ID.",
    };
  }
}
