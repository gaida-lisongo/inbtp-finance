import { headers } from "next/headers";

import { sendMicrosoft365Mail } from "@/lib/utils/microsoft-graph";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { createAdminClient } from "@/lib/utils/supabase/admin";

export type RetraitStatus = "brouillon" | "pending" | "approved" | "rejected" | "paid";

export type RetraitRecord = {
  id: string;
  created_at: string;
  montant: number | null;
  designation: string | null;
  description: string | null;
  status: string | null;
  categorie: string | null;
  orderNumber: string | null;
  agent_id: string | null;
  pgrogramme_id: string | null;
  annee_id: string | null;
};

export type RetraitWithAgent = RetraitRecord & {
  agentDisplayName: string;
  agentEmail: string | null;
};

const controlMailAddress = process.env.CONTROL_MAIL;
const configuredAppUrl = process.env.NEXT_PUBLIC_HOST_URL;

const emptyToNull = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const normalizeStatus = (value: string | null | undefined): RetraitStatus | null => {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (
    normalizedValue === "brouillon" ||
    normalizedValue === "pending" ||
    normalizedValue === "approved" ||
    normalizedValue === "rejected" ||
    normalizedValue === "paid"
  ) {
    return normalizedValue;
  }

  return null;
};

const getAppOrigin = async () => {
  if (configuredAppUrl) {
    try {
      return new URL(configuredAppUrl).origin;
    } catch {
      // Fall back to the current request headers.
    }
  }

  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");

  if (!host) {
    throw new Error("app_origin_not_available");
  }

  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProto ?? (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${protocol}://${host}`;
};

const getAuthorizedAgent = async () => {
  const user = await getAuthenticatedUser();

  if (!user || !user.canAccessAdmin || !user.agentId) {
    throw new Error("access_denied");
  }

  const activeCodes = await getActiveAutorisationCodesForAgent(user.agentId);

  if (!activeCodes.includes("CS")) {
    throw new Error("access_denied");
  }

  return user;
};

const getAgentDisplayName = (agent: {
  prenom: string | null;
  post_nom: string | null;
  nom: string | null;
}) => {
  const name = [agent.prenom, agent.post_nom, agent.nom].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : "Chef de section";
};

export const getRetraitsForAgent = async (agentId: string, anneeId: string, programmeId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("retraits")
    .select("id, created_at, montant, designation, description, status, categorie, orderNumber, agent_id, pgrogramme_id, annee_id")
    .eq("agent_id", agentId)
    .eq("annee_id", anneeId)
    .eq("pgrogramme_id", programmeId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RetraitRecord[];
};

export const getRetraitById = async (id: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("retraits")
    .select("id, created_at, montant, designation, description, status, categorie, orderNumber, agent_id, pgrogramme_id, annee_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as RetraitRecord | null;
};

const getRetraitWithAgent = async (id: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("retraits")
    .select("id, created_at, montant, designation, description, status, categorie, orderNumber, agent_id, pgrogramme_id, annee_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  let agent:
    | {
        nom: string | null;
        post_nom: string | null;
        prenom: string | null;
        user_id: string | null;
      }
    | null = null;

  if (data.agent_id) {
    const { data: agentData, error: agentError } = await admin
      .from("agents")
      .select("nom, post_nom, prenom, user_id")
      .eq("id", data.agent_id)
      .maybeSingle();

    if (agentError) {
      throw new Error(agentError.message);
    }

    agent = agentData;
  }

  let agentEmail: string | null = null;

  if (agent?.user_id) {
    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(agent.user_id);

    if (userError) {
      throw new Error(userError.message);
    }

    agentEmail = authUser.user?.email ?? null;
  }

  return {
    id: data.id,
    created_at: data.created_at,
    montant: data.montant,
    designation: data.designation,
    description: data.description,
    status: data.status,
    categorie: data.categorie,
    orderNumber: data.orderNumber,
    agent_id: data.agent_id,
    pgrogramme_id: data.pgrogramme_id,
    annee_id: data.annee_id,
    agentDisplayName: agent ? getAgentDisplayName(agent) : "Chef de section",
    agentEmail,
  } as RetraitWithAgent;
};

export const createRetrait = async (formData: FormData) => {
  const user = await getAuthorizedAgent();
  const designation = emptyToNull(formData.get("designation"));
  const description = emptyToNull(formData.get("description"));
  const categorie = emptyToNull(formData.get("categorie"));
  const anneeId = emptyToNull(formData.get("annee_id"));
  const programmeId = emptyToNull(formData.get("pgrogramme_id"));
  const amountValue = emptyToNull(formData.get("montant"));

  if (!designation) {
    throw new Error("designation_required");
  }

  if (!categorie) {
    throw new Error("categorie_required");
  }

  if (!anneeId) {
    throw new Error("annee_required");
  }

  if (!programmeId) {
    throw new Error("programme_required");
  }

  if (!amountValue) {
    throw new Error("montant_required");
  }

  const montant = Number(amountValue);

  if (!Number.isFinite(montant) || montant <= 0) {
    throw new Error("invalid_montant");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("retraits").insert({
    montant,
    designation,
    description,
    status: "brouillon",
    categorie,
    orderNumber: null,
    agent_id: user.agentId,
    annee_id: anneeId,
    pgrogramme_id: programmeId,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const confirmRetrait = async (id: string) => {
  await getAuthorizedAgent();

  if (!controlMailAddress) {
    throw new Error("control_mail_not_configured");
  }

  const retrait = await getRetraitWithAgent(id);

  if (!retrait) {
    throw new Error("retrait_not_found");
  }

  if (normalizeStatus(retrait.status) !== "brouillon") {
    throw new Error("only_draft_retrait_can_be_confirmed");
  }

  const origin = await getAppOrigin();
  const retraitUrl = new URL(`/retrait/${retrait.id}`, origin).toString();
  const amount = typeof retrait.montant === "number" ? retrait.montant.toLocaleString("fr-FR") : "0";

  const html = `
    <div style="margin:0;padding:32px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="padding:32px;background:linear-gradient(135deg,#1d4ed8,#0f172a);color:#ffffff;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.8;">Demande de retrait</div>
          <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">Validation requise</h1>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.7;opacity:0.92;">
            Une nouvelle demande de retrait vient d'etre soumise et attend votre validation.
          </p>
        </div>
        <div style="padding:32px;">
          <div style="display:grid;gap:16px;">
            <div style="padding:20px;border:1px solid #e5e7eb;border-radius:18px;background:#f9fafb;">
              <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.12em;">Chef de section</div>
              <div style="margin-top:8px;font-size:18px;font-weight:700;color:#111827;">${retrait.agentDisplayName}</div>
              <div style="margin-top:6px;font-size:14px;color:#6b7280;">${retrait.agentEmail ?? "Email non disponible"}</div>
            </div>
            <div style="padding:20px;border:1px solid #e5e7eb;border-radius:18px;">
              <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.12em;">Details du retrait</div>
              <table style="width:100%;margin-top:14px;border-collapse:collapse;font-size:14px;">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;">Designation</td>
                  <td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">${retrait.designation ?? "-"}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;">Categorie</td>
                  <td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">${retrait.categorie ?? "-"}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;">Montant</td>
                  <td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">${amount}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;">Statut</td>
                  <td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">Pending</td>
                </tr>
              </table>
            </div>
            <div style="padding:20px;border-radius:18px;background:#eff6ff;border:1px solid #bfdbfe;">
              <p style="margin:0;font-size:14px;line-height:1.7;color:#1e3a8a;">
                Cliquez sur le bouton ci-dessous pour consulter la demande dans l'application. L'utilisateur devra etre authentifie avant d'acceder a la page.
              </p>
              <div style="margin-top:20px;">
                <a href="${retraitUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">
                  Ouvrir la demande
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  await sendMicrosoft365Mail({
    to: controlMailAddress,
    subject: `Validation retrait - ${retrait.designation ?? retrait.id}`,
    html,
  });

  const admin = createAdminClient();
  const { error } = await admin
    .from("retraits")
    .update({ status: "pending" })
    .eq("id", id)
    .eq("status", "brouillon");

  if (error) {
    throw new Error(error.message);
  }
};

export const deleteRetrait = async (id: string) => {
  const user = await getAuthorizedAgent();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("retraits")
    .select("id, status, agent_id")
    .eq("id", id)
    .eq("agent_id", user.agentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("retrait_not_found");
  }

  if (normalizeStatus(data.status) !== "pending") {
    throw new Error("only_pending_retrait_can_be_deleted");
  }

  const { error: deleteError } = await admin.from("retraits").delete().eq("id", id).eq("agent_id", user.agentId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }
};
