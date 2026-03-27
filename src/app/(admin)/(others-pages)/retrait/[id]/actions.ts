"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { rejectRetrait, validateRetrait } from "@/lib/utils/supabase/retraits";

const buildRedirectUrl = (id: string, status: "success" | "error", message?: string) => {
  const query = new URLSearchParams();
  query.set("status", status);

  if (message) {
    query.set("message", message);
  }

  return `/retrait/${id}?${query.toString()}`;
};

export async function validateRetraitAction(formData: FormData) {
  try {
    const id = formData.get("id");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("retrait_id_required");
    }

    const result = await validateRetrait(id, formData.get("orderNumber"));
    const message = result === "success" ? "retrait_validated" : "retrait_rejected_for_balance";
    redirect(buildRedirectUrl(id, "success", message));
  } catch (error) {
    unstable_rethrow(error);
    const id = formData.get("id");
    const retraitId = typeof id === "string" && id.length > 0 ? id : "";
    const message = error instanceof Error ? error.message : "retrait_validate_failed";
    redirect(buildRedirectUrl(retraitId, "error", message));
  }
}

export async function rejectRetraitAction(formData: FormData) {
  try {
    const id = formData.get("id");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("retrait_id_required");
    }

    await rejectRetrait(id);
    redirect(buildRedirectUrl(id, "success", "retrait_rejected"));
  } catch (error) {
    unstable_rethrow(error);
    const id = formData.get("id");
    const retraitId = typeof id === "string" && id.length > 0 ? id : "";
    const message = error instanceof Error ? error.message : "retrait_reject_failed";
    redirect(buildRedirectUrl(retraitId, "error", message));
  }
}
