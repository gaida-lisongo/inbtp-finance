import { headers } from "next/headers";

import { sendMicrosoft365Mail } from "@/lib/utils/microsoft-graph";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { createAdminClient } from "@/lib/utils/supabase/admin";

export type RetraitStatus = "brouillon" | "pending" | "success" | "no" | "paid" | "approved";

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

export type RetraitRequester = {
  id: string;
  displayName: string;
  email: string | null;
  role: string | null;
};

export type SectionFinancialSituation = {
  totalCommandesSuccess: number;
  totalRetraitsSuccess: number;
  availableBalance: number;
  linkedRevenueCount: number;
  isReliable: boolean;
  warning: string | null;
};

export type RetraitReviewDetails = {
  retrait: RetraitRecord;
  requester: RetraitRequester | null;
  sectionFinancialSituation: SectionFinancialSituation;
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

const sanitizeOrderNumber = (value: FormDataEntryValue | null) => {
  const normalizedValue = emptyToNull(value);

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.replace(/\s+/g, " ").trim();
};

const normalizeStatus = (value: string | null | undefined): RetraitStatus | null => {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (
    normalizedValue === "brouillon" ||
    normalizedValue === "pending" ||
    normalizedValue === "success" ||
    normalizedValue === "no" ||
    normalizedValue === "paid" ||
    normalizedValue === "approved"
  ) {
    return normalizedValue;
  }

  return null;
};

const formatCurrency = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    : "$0.00";

const getAppOrigin = async () => {
  if (configuredAppUrl) {
    try {
      return new URL(configuredAppUrl).origin;
    } catch {
      // Fall back to request headers.
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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDescriptionForEmail = (value: string | null) => {
  if (!value || value.trim().length === 0) {
    return "Aucune description";
  }

  return escapeHtml(value).replace(/\r\n|\n|\r/g, "<br />");
};

const buildPdfBuffer = (lines: string[]) => {
  const sanitizedLines = lines.map((line) =>
    line
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, ""),
  );
  const contentLines = sanitizedLines
    .map((line, index) => `BT /F1 12 Tf 50 ${760 - index * 22} Td (${line.replace(/[()\\]/g, "\\$&")}) Tj ET`)
    .join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${contentLines.length} >> stream\n${contentLines}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf-8");
};

const buildValidationPdfBase64 = (retrait: RetraitRecord, requester: RetraitRequester | null, balanceAfter: number) => {
  const dateValue = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const buffer = buildPdfBuffer([
    "RAPPORT DE VALIDATION DE RETRAIT",
    "",
    `Date: ${dateValue}`,
    `Retrait: ${retrait.designation ?? retrait.id}`,
    `Montant: ${formatCurrency(retrait.montant)}`,
    `Categorie: ${retrait.categorie ?? "-"}`,
    `Statut: SUCCESS`,
    `Demandeur: ${requester?.displayName ?? "Inconnu"}`,
    `Email: ${requester?.email ?? "Non disponible"}`,
    `Solde apres validation: ${formatCurrency(balanceAfter)}`,
    `Reference: ${retrait.orderNumber ?? "Non attribuee"}`,
  ]);

  return buffer.toString("base64");
};

const sendRetraitDecisionMail = async ({
  requester,
  retrait,
  accepted,
  reason,
  availableBalance,
  attachmentBase64,
}: {
  requester: RetraitRequester;
  retrait: RetraitRecord;
  accepted: boolean;
  reason?: string;
  availableBalance: number;
  attachmentBase64?: string;
}) => {
  const title = accepted ? "Retrait valide" : "Retrait invalide";
  const headerBackground = accepted
    ? "linear-gradient(135deg,#dcfce7,#bbf7d0)"
    : "linear-gradient(135deg,#fee2e2,#fecaca)";
  const headerBorder = accepted ? "#86efac" : "#fca5a5";
  const overlineColor = accepted ? "#15803d" : "#b91c1c";
  const headingColor = accepted ? "#166534" : "#991b1b";
  const introColor = accepted ? "#14532d" : "#7f1d1d";
  const retraitUrl = await getAppOrigin().then((origin) => new URL("/", origin).toString());
  const descriptionHtml = formatDescriptionForEmail(retrait.description);

  const html = `
    <div style="margin:0;padding:32px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="padding:32px;background:${headerBackground};border-bottom:1px solid ${headerBorder};">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${overlineColor};">Traitement du retrait</div>
          <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:${headingColor};">${title}</h1>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:${introColor};">
            Bonjour ${escapeHtml(requester.displayName)}, votre demande de retrait a ete ${accepted ? "validee" : "invalidee"}.
          </p>
        </div>
        <div style="padding:32px;">
          <div style="padding:20px;border:1px solid #e5e7eb;border-radius:18px;">
            <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.12em;">Synthese</div>
            <table style="width:100%;margin-top:14px;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:8px 0;color:#6b7280;">Designation</td><td style="padding:8px 0;text-align:right;font-weight:600;">${retrait.designation ?? "-"}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Montant</td><td style="padding:8px 0;text-align:right;font-weight:600;">${formatCurrency(retrait.montant)}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Statut final</td><td style="padding:8px 0;text-align:right;font-weight:600;">${accepted ? "Success" : "No"}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Solde de section</td><td style="padding:8px 0;text-align:right;font-weight:600;">${formatCurrency(availableBalance)}</td></tr>
            </table>
          </div>
          <div style="margin-top:18px;padding:20px;border:1px solid #e5e7eb;border-radius:18px;background:#f9fafb;">
            <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.12em;">Description du retrait</div>
            <p style="margin:12px 0 0;font-size:14px;line-height:1.8;color:#374151;">${descriptionHtml}</p>
          </div>
          <div style="margin-top:18px;padding:20px;border-radius:18px;background:#f9fafb;border:1px solid #e5e7eb;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">
              ${accepted ? "Le rapport PDF de validation est joint a ce message." : reason ?? "Le retrait n'a pas pu etre approuve."}
            </p>
          </div>
          <div style="margin-top:20px;">
            <a href="${retraitUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">
              Ouvrir l'application
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  await sendMicrosoft365Mail({
    to: requester.email,
    subject: `${title} - ${retrait.designation ?? retrait.id}`,
    html,
    attachments: attachmentBase64
      ? [
          {
            name: `rapport-retrait-${retrait.id}.pdf`,
            contentType: "application/pdf",
            contentBytes: attachmentBase64,
          },
        ]
      : undefined,
  });
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

const getRequesterForRetrait = async (agentId: string | null) => {
  if (!agentId) {
    return null;
  }

  const admin = createAdminClient();
  const { data: agent, error } = await admin
    .from("agents")
    .select("id, nom, post_nom, prenom, role, user_id")
    .eq("id", agentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!agent) {
    return null;
  }

  let email: string | null = null;

  if (agent.user_id) {
    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(agent.user_id);

    if (userError) {
      throw new Error(userError.message);
    }

    email = authUser.user?.email ?? null;
  }

  return {
    id: agent.id,
    displayName: getAgentDisplayName(agent),
    email,
    role: agent.role ?? null,
  } as RetraitRequester;
};

const getStudentIdsForSection = async (programmeId: string, anneeId: string) => {
  const admin = createAdminClient();
  const { data: sampleStudent, error: sampleError } = await admin.from("students").select("*").limit(1).maybeSingle();

  if (sampleError) {
    throw new Error(sampleError.message);
  }

  const availableColumns = sampleStudent ? Object.keys(sampleStudent) : [];
  const programmeColumn = ["pgrogramme_id", "programme_id", "classe_id", "programme"].find((column) =>
    availableColumns.includes(column),
  );
  const yearColumn = ["annee_id", "academic_year_id", "year_id"].find((column) => availableColumns.includes(column));

  if (!programmeColumn) {
    return {
      studentIds: [] as string[],
      isReliable: false,
      warning: "Le rattachement des recettes a cette section n'est pas configure dans la source des commandes.",
    };
  }

  let query = admin.from("students").select("id").eq(programmeColumn, programmeId);

  if (yearColumn) {
    query = query.eq(yearColumn, anneeId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    studentIds: ((data ?? []) as Array<{ id: string }>).map((student) => student.id),
    isReliable: Boolean(yearColumn || availableColumns.length > 0),
    warning: yearColumn ? null : "L'annee de rattachement des recettes est introuvable. Le calcul est filtre uniquement par section.",
  };
};

export const getSectionFinancialSituation = async (programmeId: string, anneeId: string): Promise<SectionFinancialSituation> => {
  const admin = createAdminClient();
  const studentResolution = await getStudentIdsForSection(programmeId, anneeId);
  const studentIds = studentResolution.studentIds;

  let totalCommandesSuccess = 0;

  if (studentIds.length > 0) {
    const { data: commandes, error: commandesError } = await admin
      .from("commande")
      .select("total")
      .in("student_id", studentIds)
      .eq("status", "success");

    if (commandesError) {
      throw new Error(commandesError.message);
    }

    totalCommandesSuccess = ((commandes ?? []) as Array<{ total: number | null }>).reduce(
      (sum, item) => sum + (typeof item.total === "number" ? item.total : 0),
      0,
    );
  }

  const { data: retraits, error: retraitsError } = await admin
    .from("retraits")
    .select("montant")
    .eq("pgrogramme_id", programmeId)
    .eq("annee_id", anneeId)
    .eq("status", "success");

  if (retraitsError) {
    throw new Error(retraitsError.message);
  }

  const totalRetraitsSuccess = ((retraits ?? []) as Array<{ montant: number | null }>).reduce(
    (sum, item) => sum + (typeof item.montant === "number" ? item.montant : 0),
    0,
  );

  return {
    totalCommandesSuccess,
    totalRetraitsSuccess,
    availableBalance: totalCommandesSuccess - totalRetraitsSuccess,
    linkedRevenueCount: studentIds.length,
    isReliable: studentResolution.isReliable,
    warning: studentResolution.warning,
  };
};

export const getRetraitReviewDetails = async (id: string): Promise<RetraitReviewDetails | null> => {
  const retrait = await getRetraitById(id);

  if (!retrait) {
    return null;
  }

  const requester = await getRequesterForRetrait(retrait.agent_id);
  const sectionFinancialSituation =
    retrait.pgrogramme_id && retrait.annee_id
      ? await getSectionFinancialSituation(retrait.pgrogramme_id, retrait.annee_id)
      : {
          totalCommandesSuccess: 0,
          totalRetraitsSuccess: 0,
          availableBalance: 0,
          linkedRevenueCount: 0,
          isReliable: false,
          warning: "Les donnees de section sont incompletes pour ce retrait.",
        };

  return {
    retrait,
    requester,
    sectionFinancialSituation,
  };
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

  const reviewDetails = await getRetraitReviewDetails(id);

  if (!reviewDetails) {
    throw new Error("retrait_not_found");
  }

  if (normalizeStatus(reviewDetails.retrait.status) !== "brouillon") {
    throw new Error("only_draft_retrait_can_be_confirmed");
  }

  const origin = await getAppOrigin();
  const retraitUrl = new URL(`/retrait/${reviewDetails.retrait.id}`, origin).toString();
  const descriptionHtml = formatDescriptionForEmail(reviewDetails.retrait.description);

  const html = `
    <div style="margin:0;padding:32px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="padding:32px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-bottom:1px solid #93c5fd;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#1d4ed8;">Demande de retrait</div>
          <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:#1e3a8a;">Validation requise</h1>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#334155;">
            Une nouvelle demande de retrait vient d'etre soumise et attend votre validation.
          </p>
        </div>
        <div style="padding:32px;">
          <div style="display:grid;gap:16px;">
            <div style="padding:20px;border:1px solid #e5e7eb;border-radius:18px;background:#f9fafb;">
              <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.12em;">Chef de section</div>
              <div style="margin-top:8px;font-size:18px;font-weight:700;color:#111827;">${reviewDetails.requester?.displayName ?? "Chef de section"}</div>
              <div style="margin-top:6px;font-size:14px;color:#6b7280;">${reviewDetails.requester?.email ?? "Email non disponible"}</div>
            </div>
            <div style="padding:20px;border:1px solid #e5e7eb;border-radius:18px;">
              <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.12em;">Details du retrait</div>
              <table style="width:100%;margin-top:14px;border-collapse:collapse;font-size:14px;">
                <tr><td style="padding:8px 0;color:#6b7280;">Designation</td><td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">${reviewDetails.retrait.designation ?? "-"}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;">Categorie</td><td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">${reviewDetails.retrait.categorie ?? "-"}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;">Montant</td><td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">${formatCurrency(reviewDetails.retrait.montant)}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;">Statut</td><td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">Pending</td></tr>
              </table>
            </div>
            <div style="padding:20px;border:1px solid #e5e7eb;border-radius:18px;background:#f9fafb;">
              <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.12em;">Description du retrait</div>
              <p style="margin:12px 0 0;font-size:14px;line-height:1.8;color:#374151;">${descriptionHtml}</p>
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
    subject: `Validation retrait - ${reviewDetails.retrait.designation ?? reviewDetails.retrait.id}`,
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

export const validateRetrait = async (id: string, orderNumberInput: FormDataEntryValue | null) => {
  const user = await getAuthenticatedUser();

  if (!user || !user.canAccessAdmin || !user.agentId) {
    throw new Error("access_denied");
  }

  const reviewDetails = await getRetraitReviewDetails(id);

  if (!reviewDetails) {
    throw new Error("retrait_not_found");
  }

  if (reviewDetails.retrait.agent_id === user.agentId) {
    throw new Error("retrait_owner_cannot_access_review");
  }

  if (normalizeStatus(reviewDetails.retrait.status) !== "pending") {
    throw new Error("only_pending_retrait_can_be_processed");
  }

  if (!reviewDetails.requester?.email) {
    throw new Error("retrait_requester_email_missing");
  }

  const orderNumber = sanitizeOrderNumber(orderNumberInput);

  if (!orderNumber) {
    throw new Error("order_number_required");
  }

  const retraitAmount = reviewDetails.retrait.montant ?? 0;
  const canSupportRetrait = reviewDetails.sectionFinancialSituation.availableBalance >= retraitAmount;
  const admin = createAdminClient();

  if (canSupportRetrait) {
    const { error } = await admin
      .from("retraits")
      .update({ status: "success", orderNumber })
      .eq("id", id)
      .eq("status", "pending");

    if (error) {
      throw new Error(error.message);
    }

    const validatedRetrait = {
      ...reviewDetails.retrait,
      orderNumber,
      status: "success",
    };
    const balanceAfter = reviewDetails.sectionFinancialSituation.availableBalance - retraitAmount;
    const pdfBase64 = buildValidationPdfBase64(validatedRetrait, reviewDetails.requester, balanceAfter);

    await sendRetraitDecisionMail({
      requester: reviewDetails.requester,
      retrait: validatedRetrait,
      accepted: true,
      availableBalance: balanceAfter,
      attachmentBase64: pdfBase64,
    });

    return "success";
  }

  const { error } = await admin.from("retraits").update({ status: "no" }).eq("id", id).eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  await sendRetraitDecisionMail({
    requester: reviewDetails.requester,
    retrait: reviewDetails.retrait,
    accepted: false,
    availableBalance: reviewDetails.sectionFinancialSituation.availableBalance,
    reason: "Le solde de la section ne permet pas de supporter ce retrait pour le moment.",
  });

  return "no";
};

export const rejectRetrait = async (id: string) => {
  const user = await getAuthenticatedUser();

  if (!user || !user.canAccessAdmin || !user.agentId) {
    throw new Error("access_denied");
  }

  const reviewDetails = await getRetraitReviewDetails(id);

  if (!reviewDetails) {
    throw new Error("retrait_not_found");
  }

  if (reviewDetails.retrait.agent_id === user.agentId) {
    throw new Error("retrait_owner_cannot_access_review");
  }

  if (normalizeStatus(reviewDetails.retrait.status) !== "pending") {
    throw new Error("only_pending_retrait_can_be_processed");
  }

  if (!reviewDetails.requester?.email) {
    throw new Error("retrait_requester_email_missing");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("retraits").update({ status: "no" }).eq("id", id).eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  await sendRetraitDecisionMail({
    requester: reviewDetails.requester,
    retrait: reviewDetails.retrait,
    accepted: false,
    availableBalance: reviewDetails.sectionFinancialSituation.availableBalance,
    reason: "La demande de retrait a ete invalidee apres revision du dossier.",
  });

  return "no";
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
