"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { createSemestre, createUnite, deleteSemestre, deleteUnite, updateSemestre } from "@/lib/utils/supabase/enseignement";

const buildRedirectUrl = (formData: FormData, status: "success" | "error", message?: string) => {
  const annee = formData.get("annee");
  const promotion = formData.get("promotion");
  const query = new URLSearchParams();

  if (typeof annee === "string" && annee.length > 0) {
    query.set("annee", annee);
  }

  if (typeof promotion === "string" && promotion.length > 0) {
    query.set("promotion", promotion);
  }

  query.set("status", status);

  if (message) {
    query.set("message", message);
  }

  return `/ce?${query.toString()}`;
};

export async function createSemestreAction(formData: FormData) {
  try {
    await createSemestre(formData);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "semestre_create_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}

export async function deleteSemestreAction(formData: FormData) {
  try {
    const id = formData.get("id");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("semestre_id_required");
    }

    await deleteSemestre(id);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "semestre_delete_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}

export async function updateSemestreAction(formData: FormData) {
  try {
    await updateSemestre(formData);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "semestre_update_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}

export async function createUniteAction(formData: FormData) {
  try {
    await createUnite(formData);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "unite_create_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}

export async function deleteUniteAction(formData: FormData) {
  try {
    const id = formData.get("id");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("unite_id_required");
    }

    await deleteUnite(id);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "unite_delete_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}
