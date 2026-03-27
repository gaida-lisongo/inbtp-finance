"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { attachCoursToProgrammeTeam, createMatiere, deleteMatiere, saveCoursForMatiere } from "@/lib/utils/supabase/enseignement";

const buildRedirectUrl = (formData: FormData, status: "success" | "error", message?: string) => {
  const annee = formData.get("annee");
  const promotion = formData.get("promotion");
  const unite = formData.get("unite");
  const matiere = formData.get("matiere");
  const query = new URLSearchParams();

  if (typeof annee === "string" && annee.length > 0) {
    query.set("annee", annee);
  }

  if (typeof promotion === "string" && promotion.length > 0) {
    query.set("promotion", promotion);
  }

  if (typeof unite === "string" && unite.length > 0) {
    query.set("unite", unite);
  }

  if (typeof matiere === "string" && matiere.length > 0) {
    query.set("matiere", matiere);
  }

  query.set("status", status);

  if (message) {
    query.set("message", message);
  }

  return `/ce/unite?${query.toString()}`;
};

export async function createMatiereAction(formData: FormData) {
  try {
    await createMatiere(formData);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "matiere_create_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}

export async function deleteMatiereAction(formData: FormData) {
  try {
    const id = formData.get("id");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("matiere_id_required");
    }

    await deleteMatiere(id);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "matiere_delete_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}

export async function saveCoursAction(formData: FormData) {
  try {
    await saveCoursForMatiere(formData);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "cours_save_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}

export async function createCoursChannelAction(formData: FormData) {
  try {
    await attachCoursToProgrammeTeam(formData);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "cours_channel_create_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}
