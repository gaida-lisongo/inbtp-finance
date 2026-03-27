"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import {
  bulkCreateParcoursFromCsv,
  deleteParcours,
  deleteSession,
  notifyStudentsForSession,
  saveParcours,
  saveParcoursRecord,
  saveSession,
  saveSessionRecord,
  type ParcoursInput,
  type SessionInput,
} from "@/lib/utils/supabase/appariteur";

const buildAppRedirect = (params: {
  annee: string;
  promotion: string;
  status: "success" | "error";
  message?: string;
  sessionEdit?: string;
  parcoursEdit?: string;
  mode?: string;
}) => {
  const query = new URLSearchParams();
  query.set("annee", params.annee);
  query.set("promotion", params.promotion);
  query.set("status", params.status);

  if (params.message) {
    query.set("message", params.message);
  }

  if (params.sessionEdit) {
    query.set("sessionEdit", params.sessionEdit);
  }

  if (params.parcoursEdit) {
    query.set("parcoursEdit", params.parcoursEdit);
  }

  if (params.mode) {
    query.set("mode", params.mode);
  }

  return `/app?${query.toString()}`;
};

const getRouteContext = (formData: FormData) => {
  const annee = formData.get("annee");
  const promotion = formData.get("promotion");

  if (typeof annee !== "string" || annee.length === 0 || typeof promotion !== "string" || promotion.length === 0) {
    throw new Error("route_context_required");
  }

  return { annee, promotion };
};

export async function saveSessionAction(formData: FormData) {
  try {
    const routeContext = getRouteContext(formData);
    await saveSession(formData);
    redirect(buildAppRedirect({ ...routeContext, status: "success" }));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "session_save_failed";
    const id = formData.get("id");
    const routeContext = getRouteContext(formData);

    redirect(
      buildAppRedirect({
        ...routeContext,
        status: "error",
        message,
        sessionEdit: typeof id === "string" && id.length > 0 ? id : undefined,
        mode: typeof id === "string" && id.length > 0 ? undefined : "session-create",
      }),
    );
  }
}

export async function deleteSessionAction(formData: FormData) {
  try {
    const id = formData.get("id");
    const routeContext = getRouteContext(formData);

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("session_id_required");
    }

    await deleteSession(id);
    redirect(buildAppRedirect({ ...routeContext, status: "success" }));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "session_delete_failed";
    const routeContext = getRouteContext(formData);
    redirect(buildAppRedirect({ ...routeContext, status: "error", message }));
  }
}

export async function saveParcoursAction(formData: FormData) {
  try {
    const routeContext = getRouteContext(formData);
    await saveParcours(formData);
    redirect(buildAppRedirect({ ...routeContext, status: "success" }));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "parcours_save_failed";
    const id = formData.get("id");
    const routeContext = getRouteContext(formData);

    redirect(
      buildAppRedirect({
        ...routeContext,
        status: "error",
        message,
        parcoursEdit: typeof id === "string" && id.length > 0 ? id : undefined,
        mode: typeof id === "string" && id.length > 0 ? undefined : "parcours-create",
      }),
    );
  }
}

export async function deleteParcoursAction(formData: FormData) {
  try {
    const id = formData.get("id");
    const routeContext = getRouteContext(formData);

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("parcours_id_required");
    }

    await deleteParcours(id);
    redirect(buildAppRedirect({ ...routeContext, status: "success" }));
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "parcours_delete_failed";
    const routeContext = getRouteContext(formData);
    redirect(buildAppRedirect({ ...routeContext, status: "error", message }));
  }
}

export async function saveSessionModalAction(input: SessionInput) {
  const session = await saveSessionRecord(input);
  const shouldNotify = !input.id;
  let notification: { notifiedCount: number; skippedCount: number } | null = null;
  let notificationError: string | null = null;

  if (shouldNotify) {
    try {
      notification = await notifyStudentsForSession(input.programme_id, session.id);
    } catch (error) {
      notificationError = error instanceof Error ? error.message : "session_notification_failed";
    }
  }

  revalidatePath("/app");
  return { session, notification, notificationError };
}

export async function deleteSessionByIdAction(id: string) {
  await deleteSession(id);
  revalidatePath("/app");
}

export async function saveParcoursModalAction(input: ParcoursInput) {
  const parcours = await saveParcoursRecord(input);
  revalidatePath("/app");
  return parcours;
}

export async function deleteParcoursByIdAction(id: string) {
  await deleteParcours(id);
  revalidatePath("/app");
}

export async function bulkCreateParcoursAction(programmeId: string, csvContent: string) {
  const parcours = await bulkCreateParcoursFromCsv(programmeId, csvContent);
  revalidatePath("/app");
  return parcours;
}
