"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

type PromotionFieldErrors = Partial<Record<"designation" | "slug", string>>;

export type PromotionActionResult = {
  ok: boolean;
  message: string;
  errors?: PromotionFieldErrors;
};

const normalizeValue = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getReadableDatabaseError = (message: string) => {
  if (message.includes("row-level security policy")) {
    return "Operation refusee par les regles de securite Supabase sur la table promotions.";
  }

  return message;
};

const validatePromotionPayload = ({
  designation,
  slug,
}: {
  designation: string;
  slug: string;
}) => {
  const errors: PromotionFieldErrors = {};

  if (!designation) {
    errors.designation = "La designation est obligatoire.";
  }

  if (!slug) {
    errors.slug = "Le slug est obligatoire.";
  }

  return errors;
};

export async function savePromotionAction(formData: FormData): Promise<PromotionActionResult> {
  const id = normalizeValue(formData.get("id"));
  const designation = normalizeValue(formData.get("designation"));
  const rawSlug = normalizeValue(formData.get("slug"));
  const description = normalizeValue(formData.get("description"));
  const slug = rawSlug || slugify(designation);

  const errors = validatePromotionPayload({ designation, slug });

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "Le formulaire contient des erreurs.",
      errors,
    };
  }

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const payload = {
    designation,
    slug: slug || null,
    description: description || null,
  };

  const query = id
    ? supabase.from("promotions").update(payload).eq("id", id)
    : supabase.from("promotions").insert(payload);

  const { error } = await query;

  if (error) {
    return {
      ok: false,
      message: getReadableDatabaseError(error.message),
    };
  }

  revalidatePath("/promotions");

  return {
    ok: true,
    message: id ? "La promotion a ete mise a jour." : "La promotion a ete creee.",
  };
}

export async function deletePromotionAction(id: string): Promise<PromotionActionResult> {
  if (!id) {
    return {
      ok: false,
      message: "Identifiant de promotion manquant.",
    };
  }

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { error } = await supabase.from("promotions").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: getReadableDatabaseError(error.message),
    };
  }

  revalidatePath("/promotions");

  return {
    ok: true,
    message: "La promotion a ete supprimee.",
  };
}
