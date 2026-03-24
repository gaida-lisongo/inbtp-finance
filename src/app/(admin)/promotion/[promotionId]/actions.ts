"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

type FraisFieldErrors = Partial<Record<"designation" | "montant", string>>;

export type FraisActionResult = {
  ok: boolean;
  message: string;
  errors?: FraisFieldErrors;
};

export type FraisBulkInput = {
  designation: string;
  description: string;
  montant: number;
};

export type FraisBulkInsertResult = {
  ok: boolean;
  message: string;
  insertedCount: number;
};

const normalizeValue = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const normalizeCsvValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeMultilineText = (value: string) => value.replace(/\\n/g, "\n").trim();

const parseMontant = (value: string) => {
  if (!value) {
    return Number.NaN;
  }

  return Number(value);
};

const validateFraisPayload = ({
  designation,
  montant,
}: {
  designation: string;
  montant: number;
}) => {
  const errors: FraisFieldErrors = {};

  if (!designation) {
    errors.designation = "La designation est obligatoire.";
  }

  if (!Number.isFinite(montant) || montant < 0) {
    errors.montant = "Le montant doit etre un nombre positif.";
  }

  return errors;
};

const getSupabase = async () => {
  const cookieStore = await cookies();
  return createServerSupabaseClient(cookieStore);
};

const revalidatePromotionPages = (promotionId: string) => {
  revalidatePath(`/promotion/${promotionId}`);
};

export async function saveFraisAction(formData: FormData): Promise<FraisActionResult> {
  const id = normalizeValue(formData.get("id"));
  const promotionId = normalizeValue(formData.get("promotionId"));
  const designation = normalizeValue(formData.get("designation"));
  const description = normalizeMultilineText(normalizeValue(formData.get("description")));
  const montant = parseMontant(normalizeValue(formData.get("montant")));

  if (!promotionId) {
    return {
      ok: false,
      message: "Promotion introuvable pour ce frais.",
    };
  }

  const errors = validateFraisPayload({ designation, montant });

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "Le formulaire contient des erreurs.",
      errors,
    };
  }

  const payload = {
    designation,
    description: description || null,
    montant,
    promotion_id: promotionId,
  };

  const supabase = await getSupabase();
  const query = id
    ? supabase.from("frais").update(payload).eq("id", id)
    : supabase.from("frais").insert(payload);

  const { error } = await query;

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePromotionPages(promotionId);

  return {
    ok: true,
    message: id ? "Le frais a ete mis a jour." : "Le frais a ete cree.",
  };
}

export async function deleteFraisAction({
  id,
  promotionId,
}: {
  id: string;
  promotionId: string;
}): Promise<FraisActionResult> {
  if (!id || !promotionId) {
    return {
      ok: false,
      message: "Informations insuffisantes pour supprimer ce frais.",
    };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.from("frais").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePromotionPages(promotionId);

  return {
    ok: true,
    message: "Le frais a ete supprime.",
  };
}

export async function bulkInsertFraisAction(
  promotionId: string,
  rows: FraisBulkInput[],
): Promise<FraisBulkInsertResult> {
  if (!promotionId) {
    return {
      ok: false,
      message: "Promotion introuvable pour cet import.",
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

  const payload = rows.map((row) => ({
    designation: normalizeCsvValue(row.designation),
    description: normalizeMultilineText(normalizeCsvValue(row.description)) || null,
    montant: Number(row.montant),
    promotion_id: promotionId,
  }));

  const invalidRow = payload.find(
    (row) => !row.designation || !Number.isFinite(row.montant) || row.montant < 0,
  );

  if (invalidRow) {
    return {
      ok: false,
      message: "Certaines lignes du lot sont invalides.",
      insertedCount: 0,
    };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.from("frais").insert(payload);

  if (error) {
    return {
      ok: false,
      message: error.message,
      insertedCount: 0,
    };
  }

  revalidatePromotionPages(promotionId);

  return {
    ok: true,
    message: `${payload.length} frais ajoute(s).`,
    insertedCount: payload.length,
  };
}
