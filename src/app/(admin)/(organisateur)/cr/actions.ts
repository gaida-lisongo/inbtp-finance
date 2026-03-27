"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { deleteResearchRecord, saveResearchRecord, type ResearchTableName } from "@/lib/utils/supabase/recherche";

const getEntityTab = (value: FormDataEntryValue | null): ResearchTableName => {
  if (value === "stages" || value === "sujets" || value === "laboratoires") {
    return value;
  }

  throw new Error("research_entity_required");
};

const buildRedirectUrl = (formData: FormData, status: "success" | "error", message?: string) => {
  const annee = formData.get("annee");
  const promotion = formData.get("promotion");
  const tab = formData.get("tab");
  const query = new URLSearchParams();

  if (typeof annee === "string" && annee.length > 0) {
    query.set("annee", annee);
  }

  if (typeof promotion === "string" && promotion.length > 0) {
    query.set("promotion", promotion);
  }

  if (typeof tab === "string" && tab.length > 0) {
    query.set("tab", tab);
  }

  query.set("status", status);

  if (message) {
    query.set("message", message);
  }

  return `/cr?${query.toString()}`;
};

export async function saveResearchRecordAction(formData: FormData) {
  try {
    const entity = getEntityTab(formData.get("entity"));
    await saveResearchRecord(entity, formData);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "research_save_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}

export async function deleteResearchRecordAction(formData: FormData) {
  try {
    const entity = getEntityTab(formData.get("entity"));
    const id = formData.get("id");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("research_id_required");
    }

    await deleteResearchRecord(entity, id);
    redirect(buildRedirectUrl(formData, "success"));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "research_delete_failed";
    redirect(buildRedirectUrl(formData, "error", message));
  }
}
