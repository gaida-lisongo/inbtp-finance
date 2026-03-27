"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { confirmRetrait, createRetrait, deleteRetrait } from "@/lib/utils/supabase/retraits";

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

  return `/cs?${query.toString()}`;
};

export async function createRetraitAction(formData: FormData) {
  try {
    await createRetrait(formData);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "retrait_create_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}

export async function deleteRetraitAction(formData: FormData) {
  try {
    const id = formData.get("id");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("retrait_id_required");
    }

    await deleteRetrait(id);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "retrait_delete_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}

export async function confirmRetraitAction(formData: FormData) {
  try {
    const id = formData.get("id");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("retrait_id_required");
    }

    await confirmRetrait(id);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "retrait_confirm_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}
