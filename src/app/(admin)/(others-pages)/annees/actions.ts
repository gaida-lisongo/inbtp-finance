"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

type AnneeFieldErrors = Partial<
  Record<"designation" | "debut" | "fin" | "slug" | "status", string>
>;

export type AnneeActionResult = {
  ok: boolean;
  message: string;
  errors?: AnneeFieldErrors;
};

const normalizeValue = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const validateAnneePayload = ({
  designation,
  debut,
  fin,
  slug,
  status,
}: {
  designation: string;
  debut: string;
  fin: string;
  slug: string;
  status: string;
}) => {
  const errors: AnneeFieldErrors = {};

  if (!designation) {
    errors.designation = "La designation est obligatoire.";
  }

  if (!debut) {
    errors.debut = "La date de debut est obligatoire.";
  }

  if (!fin) {
    errors.fin = "La date de fin est obligatoire.";
  }

  if (debut && fin && new Date(debut) > new Date(fin)) {
    errors.fin = "La date de fin doit etre posterieure a la date de debut.";
  }

  if (!slug) {
    errors.slug = "Le slug est obligatoire.";
  }

  if (!status) {
    errors.status = "Le statut est obligatoire.";
  }

  return errors;
};

const getReadableDatabaseError = (message: string) => {
  if (message.includes("row-level security policy")) {
    return "Operation refusee par les regles de securite Supabase sur la table annees.";
  }

  return message;
};

export async function saveAnneeAction(formData: FormData): Promise<AnneeActionResult> {
  const id = normalizeValue(formData.get("id"));
  const designation = normalizeValue(formData.get("designation"));
  const debut = normalizeValue(formData.get("debut"));
  const fin = normalizeValue(formData.get("fin"));
  const status = normalizeValue(formData.get("status")) || "active";
  const rawSlug = normalizeValue(formData.get("slug"));
  const slug = rawSlug || slugify(designation);

  const errors = validateAnneePayload({
    designation,
    debut,
    fin,
    slug,
    status,
  });

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
    debut,
    fin,
    slug,
    status,
  };

  const query = id
    ? supabase.from("annees").update(payload).eq("id", id)
    : supabase.from("annees").insert(payload);

  const { error } = await query;

  if (error) {
    return {
      ok: false,
      message: getReadableDatabaseError(error.message),
    };
  }

  revalidatePath("/annees");

  return {
    ok: true,
    message: id
      ? "L'annee academique a ete mise a jour."
      : "L'annee academique a ete creee.",
  };
}

export async function deleteAnneeAction(id: string): Promise<AnneeActionResult> {
  if (!id) {
    return {
      ok: false,
      message: "Identifiant introuvable pour la suppression.",
    };
  }

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { error } = await supabase.from("annees").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: getReadableDatabaseError(error.message),
    };
  }

  revalidatePath("/annees");

  return {
    ok: true,
    message: "L'annee academique a ete supprimee.",
  };
}
