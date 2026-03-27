"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { bulkAttachProgrammesToTeams, deleteProgramme, saveProgramme } from "@/lib/utils/supabase/programmes";

const buildProgrammesRedirect = (params: {
  status: "success" | "error";
  message?: string;
  mode?: string;
  edit?: string;
}) => {
  const query = new URLSearchParams();
  query.set("status", params.status);

  if (params.message) {
    query.set("message", params.message);
  }

  if (params.mode) {
    query.set("mode", params.mode);
  }

  if (params.edit) {
    query.set("edit", params.edit);
  }

  return `/programmes?${query.toString()}`;
};

export async function saveProgrammeAction(formData: FormData) {
  try {
    await saveProgramme(formData);
    redirect(buildProgrammesRedirect({ status: "success" }));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "programme_save_failed";
    const id = formData.get("id");
    const mode = typeof id === "string" && id.length > 0 ? undefined : "create";
    const edit = typeof id === "string" && id.length > 0 ? id : undefined;
    redirect(buildProgrammesRedirect({ status: "error", message, mode, edit }));
  }
}

export async function deleteProgrammeAction(formData: FormData) {
  try {
    const id = formData.get("id");

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("programme_id_required");
    }

    await deleteProgramme(id);
    redirect(buildProgrammesRedirect({ status: "success" }));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "programme_delete_failed";
    redirect(buildProgrammesRedirect({ status: "error", message }));
  }
}

export async function bulkAttachProgrammesToTeamsAction(formData: FormData) {
  try {
    const programmeIds = formData.getAll("programme_ids").filter((value): value is string => typeof value === "string");
    const linkedCount = await bulkAttachProgrammesToTeams(programmeIds);

    redirect(buildProgrammesRedirect({ status: "success", message: `${linkedCount} promotion(s) associee(s) a Teams.` }));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "programme_bulk_attach_failed";
    redirect(buildProgrammesRedirect({ status: "error", message }));
  }
}
