import { PaymentService } from "@/lib/services/PaymentService";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getDocumentCategory, type DocumentRecord } from "@/lib/utils/supabase/documents-shared";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import type { StudentRecord } from "@/lib/utils/supabase/students-shared";
import type { SessionRecord } from "@/lib/utils/supabase/appariteur";
import type { ResearchRecord } from "@/lib/utils/supabase/recherche-shared";
import { sendMicrosoft365Mail } from "@/lib/utils/microsoft-graph";

export type CommandeCategory = "documents" | "session" | "stages" | "sujets" | "laboratoire";
export type PaymentChannel = "MOBILE_MONEY" | "CREDIT_CARD";
export type PaymentCurrency = "USD";

type ActivityCommandeCategory = "tp" | "qcm" | "ressource";
type CommandePaymentCategory = CommandeCategory | ActivityCommandeCategory;

export type CommandeRecord = {
  id: string;
  created_at: string;
  product: string | null;
  categorie: string | null;
  student_id: string | null;
  orderNumber: string | null;
  total: number | null;
  status: string | null;
  description: string | null;
};

export type PaiementRecord = {
  id: string;
  created_at: string;
  product: string | null;
  produc_id: string | null;
  student_id: string | null;
  status: string | null;
  amount: number | null;
  orderNumber: string | null;
  description: string | null;
  categorie: string | null;
};

export type CommandeResourceSummary = {
  id: string;
  category: CommandeCategory;
  tableName: "documents" | "session" | "stages" | "sujets" | "laboratoires";
  title: string;
  description: string | null;
  amount: number | null;
  programmeId: string | null;
  documentCategory: string | null;
};

export type CommandePageData = {
  student: Pick<StudentRecord, "id" | "email" | "telephone" | "nom" | "post_nom" | "prenom" | "grade">;
  resource: CommandeResourceSummary;
  existingSuccessCommande: CommandeRecord | null;
};

export type ProductRenderMode = "form" | "document" | "message";

export type ProductPageData = CommandePageData & {
  renderMode: ProductRenderMode;
  commandePath: string;
  productPath: string;
  hasPaidAccess: boolean;
};

type ResearchCategory = Extract<CommandeCategory, "stages" | "sujets" | "laboratoire">;

type CreateCommandeDraftInput = {
  category: CommandeCategory;
  resourceId: string;
  channel: PaymentChannel;
  phone?: string | null;
  description?: string | null;
};

type ConfirmCommandePaymentInput = CreateCommandeDraftInput & {
  commandeId: string;
};

type CreateManualPaiementRequestInput = {
  category: CommandeCategory;
  resourceId: string;
  description?: string | null;
};

type DraftCommandeResult = {
  commande: CommandeRecord;
  resource: CommandeResourceSummary;
  student: Pick<StudentRecord, "id" | "email" | "telephone" | "nom" | "post_nom" | "prenom" | "grade">;
};

type ConfirmCommandeResult = {
  commande: CommandeRecord;
  message: string;
  provider: string | null;
  orderNumber: string;
  rawData: unknown;
};

type ManualPaiementRequestResult = {
  commande: CommandeRecord;
  resource: CommandeResourceSummary;
  student: Pick<StudentRecord, "id" | "email" | "telephone" | "nom" | "post_nom" | "prenom" | "grade">;
  orderNumber: string;
  invoicePath: string;
  message: string;
};

type PaymentValidationResult = {
  success: boolean;
  message: string;
  commande: CommandeRecord;
  paymentResponse: unknown;
  category: CommandePaymentCategory;
  productId: string;
  productPath: string;
  commandePath: string;
};

const resourceConfig: Record<
  CommandeCategory,
  {
    tableName: "documents" | "session" | "stages" | "sujets" | "laboratoires";
    label: string;
  }
> = {
  documents: {
    tableName: "documents",
    label: "Document",
  },
  session: {
    tableName: "session",
    label: "Session",
  },
  stages: {
    tableName: "stages",
    label: "Stage",
  },
  sujets: {
    tableName: "sujets",
    label: "Sujet",
  },
  laboratoire: {
    tableName: "laboratoires",
    label: "Laboratoire",
  },
};

const getCommandeCategoryAliases = (category: CommandeCategory) => {
  switch (category) {
    case "documents":
      return ["documents", "document"];
    case "session":
      return ["session", "sessions"];
    case "stages":
      return ["stages", "stage"];
    case "sujets":
      return ["sujets", "sujet"];
    case "laboratoire":
      return ["laboratoire", "laboratoires"];
    default:
      return [category];
  }
};

const normalizeCommandeCategoryValue = (value: string | null | undefined): CommandeCategory | null => {
  const normalized = normalizeText(value)?.toLowerCase();

  switch (normalized) {
    case "documents":
    case "document":
      return "documents";
    case "session":
    case "sessions":
      return "session";
    case "stages":
    case "stage":
      return "stages";
    case "sujets":
    case "sujet":
      return "sujets";
    case "laboratoire":
    case "laboratoires":
      return "laboratoire";
    default:
      return null;
  }
};

const normalizeActivityCommandeCategory = (value: string | null | undefined): ActivityCommandeCategory | null => {
  const normalized = normalizeText(value)?.toLowerCase();

  if (normalized === "tp" || normalized === "qcm" || normalized === "ressource") {
    return normalized;
  }

  return null;
};

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const formatUnknownText = (value: unknown) => {
  if (typeof value === "string") {
    return normalizeText(value);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.text === "string") {
    return normalizeText(record.text);
  }

  return normalizeText(JSON.stringify(value));
};

const getStudentDisplayName = (student: Pick<StudentRecord, "prenom" | "post_nom" | "nom">) => {
  return [student.prenom, student.post_nom, student.nom].filter(Boolean).join(" ").trim() || "Etudiant";
};

const resolveCurrentStudent = async () => {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("auth_required");
  }

  const normalizedEmail = normalizeText(user.email)?.toLowerCase();

  if (!normalizedEmail) {
    throw new Error("student_not_found");
  }

  const admin = createAdminClient();
  const { data: studentByEmailRows, error: studentByEmailError } = await admin
    .from("students")
    .select("id, email, telephone, nom, post_nom, prenom, grade, user_id")
    .ilike("email", normalizedEmail)
    .limit(1);

  if (studentByEmailError) {
    throw new Error(studentByEmailError.message);
  }

  const studentByEmail = (studentByEmailRows ?? [])[0];

  if (studentByEmail) {
    return studentByEmail as Pick<StudentRecord, "id" | "email" | "telephone" | "nom" | "post_nom" | "prenom" | "grade">;
  }

  const { data: studentByUserIdRows, error: studentByUserIdError } = await admin
    .from("students")
    .select("id, email, telephone, nom, post_nom, prenom, grade, user_id")
    .eq("user_id", user.id)
    .limit(1);

  if (studentByUserIdError) {
    throw new Error(studentByUserIdError.message);
  }

  const studentByUserId = (studentByUserIdRows ?? [])[0];

  if (studentByUserId) {
    return studentByUserId as Pick<StudentRecord, "id" | "email" | "telephone" | "nom" | "post_nom" | "prenom" | "grade">;
  }

  throw new Error("student_not_found");
};

export const getCurrentAuthenticatedStudent = async () => resolveCurrentStudent();

const mapResearchCategoryToTable = (category: ResearchCategory) => {
  if (category === "laboratoire") {
    return "laboratoires";
  }

  return category;
};

const getResourceSummary = async (category: CommandeCategory, resourceId: string): Promise<CommandeResourceSummary> => {
  const admin = createAdminClient();
  const config = resourceConfig[category];

  if (category === "documents") {
    const { data, error } = await admin.from("documents").select("*").eq("id", resourceId).maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("resource_not_found");
    }

    const document = data as DocumentRecord;

    return {
      id: document.id,
      category,
      tableName: config.tableName,
      title: normalizeText(document.designation) ?? `${config.label} ${document.id}`,
      description: normalizeText(document.description),
      amount: typeof document.montant === "number" ? document.montant : null,
      programmeId: document.programme_id,
      documentCategory: getDocumentCategory(document),
    };
  }

  if (category === "session") {
    const { data, error } = await admin.from("session").select("*").eq("id", resourceId).maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("resource_not_found");
    }

    const session = data as SessionRecord;

    return {
      id: session.id,
      category,
      tableName: config.tableName,
      title: normalizeText(session.designation) ?? `${config.label} ${session.id}`,
      description: formatUnknownText(session.description),
      amount: typeof session.montant === "number" ? session.montant : null,
      programmeId: session.programme_id,
      documentCategory: null,
    };
  }

  const tableName = mapResearchCategoryToTable(category as ResearchCategory);
  const { data, error } = await admin.from(tableName).select("*").eq("id", resourceId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("resource_not_found");
  }

  const record = data as ResearchRecord;

  return {
    id: record.id,
    category,
    tableName: config.tableName,
    title: normalizeText(record.slug) ?? `${config.label} ${record.id}`,
    description: formatUnknownText(record.description),
    amount: typeof record.montant === "number" ? record.montant : null,
    programmeId: record.programme_id,
    documentCategory: null,
  };
};

const assertStudentCanAccessResource = async (studentId: string, programmeId: string | null) => {
  if (!programmeId) {
    throw new Error("resource_programme_missing");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("parcours")
    .select("id")
    .eq("student_id", studentId)
    .eq("programme_id", programmeId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("resource_access_denied");
  }
};

const getExistingSuccessCommande = async (studentId: string, category: CommandeCategory, resourceId: string) => {
  const categoryAliases = getCommandeCategoryAliases(category);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commande")
    .select("*")
    .eq("student_id", studentId)
    .in("categorie", categoryAliases)
    .eq("product", resourceId)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (((data ?? []) as CommandeRecord[])[0] ?? null) as CommandeRecord | null;
};

const getLatestPendingCommande = async (studentId: string, category: CommandeCategory, resourceId: string) => {
  const categoryAliases = getCommandeCategoryAliases(category);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commande")
    .select("*")
    .eq("student_id", studentId)
    .in("categorie", categoryAliases)
    .eq("product", resourceId)
    .neq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (((data ?? []) as CommandeRecord[])[0] ?? null) as CommandeRecord | null;
};

const getLatestPendingPaiement = async (studentId: string, category: CommandeCategory, resourceId: string) => {
  const categoryAliases = getCommandeCategoryAliases(category);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("paiements")
    .select('*')
    .eq("student_id", studentId)
    .in("categorie", categoryAliases)
    .eq("produc_id", resourceId)
    .neq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (((data ?? []) as PaiementRecord[])[0] ?? null) as PaiementRecord | null;
};

const buildCommandeDescription = (resource: CommandeResourceSummary, channel: PaymentChannel, customDescription?: string | null) => {
  const descriptionParts = [
    `Commande ${resourceConfig[resource.category].label.toLowerCase()}`,
    resource.title,
    channel === "MOBILE_MONEY" ? "Mobile Money" : "Carte bancaire",
    normalizeText(customDescription),
  ].filter(Boolean);

  return descriptionParts.join(" - ");
};

const createOrUpdatePendingPaiement = async (input: {
  studentId: string;
  category: CommandeCategory;
  resource: CommandeResourceSummary;
  amount: number;
  orderNumber: string;
  description: string;
}) => {
  const admin = createAdminClient();
  const payload = {
    product: input.resource.title,
    produc_id: input.resource.id,
    student_id: input.studentId,
    status: "pending",
    amount: input.amount,
    orderNumber: input.orderNumber,
    description: input.description,
    categorie: input.category,
  };
  const latestPendingPaiement = await getLatestPendingPaiement(input.studentId, input.category, input.resource.id);

  if (latestPendingPaiement) {
    const { error } = await admin.from("paiements").update(payload).eq("id", latestPendingPaiement.id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await admin.from("paiements").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
};

const updatePaiementStatusByOrderNumber = async (orderNumber: string, status: "success" | "no") => {
  const admin = createAdminClient();
  const { error } = await admin.from("paiements").update({ status }).eq("orderNumber", orderNumber);

  if (error) {
    throw new Error(error.message);
  }
};

const upsertActivityCommandeTrackingRow = async (input: {
  admin: ReturnType<typeof createAdminClient>;
  activityId: string;
  studentId: string;
  status: "pending" | "success";
  slug?: string | null;
  entraId?: string | null;
}) => {
  const { data: existingRows, error: existingError } = await input.admin
    .from("cmd_activity")
    .select("id")
    .eq("activity_id", input.activityId)
    .eq("student_id", input.studentId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existing = (existingRows ?? [])[0] as { id?: string | null } | undefined;
  const existingId = normalizeText(existing?.id);
  const payload = {
    activity_id: input.activityId,
    student_id: input.studentId,
    status: input.status,
    slug: input.slug ?? null,
    entra_id: input.entraId ?? null,
  };

  if (existingId) {
    const { error: updateError } = await input.admin.from("cmd_activity").update(payload).eq("id", existingId);
    if (updateError) {
      throw new Error(updateError.message);
    }
    return;
  }

  const { error: insertError } = await input.admin.from("cmd_activity").insert(payload);
  if (insertError) {
    throw new Error(insertError.message);
  }
};

const notifyOrganizersWhenCommandeSuccess = async (commande: CommandeRecord) => {
  const admin = createAdminClient();
  const { data: organizerRows, error: organizerError } = await admin
    .from("agents")
    .select("email")
    .eq("role", "organisateur");

  if (organizerError) {
    throw new Error(organizerError.message);
  }

  const recipients = Array.from(
    new Set(
      ((organizerRows ?? []) as Array<{ email: string | null }>)
        .map((row) => row.email?.trim().toLowerCase() ?? "")
        .filter(Boolean),
    ),
  );

  if (recipients.length === 0) {
    return;
  }

  const amountLabel =
    typeof commande.total === "number"
      ? new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2,
        }).format(commande.total)
      : "Montant indisponible";

  const orderRef = normalizeText(commande.orderNumber) ?? commande.id;
  const categoryLabel = normalizeText(commande.categorie) ?? "commande";
  const notificationPayload = {
    student_id: commande.student_id,
    object: `Commande ${orderRef} confirmee`,
    description: `La commande ${orderRef} est passee au statut success (${categoryLabel}).`,
    categorie: "commande_success",
    status: false,
    path: `/commande/order/${encodeURIComponent(orderRef)}`,
  };

  const { error: notificationInsertError } = await admin.from("notifications").insert(notificationPayload);

  if (notificationInsertError) {
    console.error("notification insert failed", notificationInsertError);
  }

  await sendMicrosoft365Mail({
    to: recipients,
    subject: `Commande ${orderRef} validee avec succes`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px;color:#1f2937;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
          <div style="padding:20px 24px;background:#111827;color:#ffffff;">
            <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.85;">Notification paiement</div>
            <h1 style="margin:10px 0 0;font-size:22px;line-height:1.35;">Commande confirmee</h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 12px;font-size:15px;line-height:1.7;">
              La commande <strong>${orderRef}</strong> est passee au statut <strong>success</strong>.
            </p>
            <p style="margin:0 0 10px;font-size:14px;line-height:1.7;">
              Categorie: <strong>${categoryLabel}</strong>
            </p>
            <p style="margin:0 0 10px;font-size:14px;line-height:1.7;">
              Montant: <strong>${amountLabel}</strong>
            </p>
          </div>
        </div>
      </div>
    `,
  });
};

const extractOrderNumber = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const keys = ["orderNumber", "order_number", "reference", "transactionId", "transaction_id", "id"];

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  const nestedKeys = ["data", "payload", "result"];

  for (const key of nestedKeys) {
    const nestedValue = record[key];
    const nestedOrderNumber = extractOrderNumber(nestedValue);

    if (nestedOrderNumber) {
      return nestedOrderNumber;
    }
  }

  return null;
};

const buildManualOrderNumber = (category: CommandeCategory) => {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BC-${category.toUpperCase()}-${stamp}-${random}`;
};

const getNestedRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
};

const extractTransactionStatus = (payload: unknown): string | null => {
  const root = getNestedRecord(payload);

  if (!root) {
    return null;
  }

  const candidates: unknown[] = [
    root.status,
    root.transactionStatus,
    getNestedRecord(root.data)?.status,
    getNestedRecord(getNestedRecord(root.data)?.data)?.status,
    getNestedRecord(getNestedRecord(getNestedRecord(root.data)?.data)?.transaction)?.status,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim().toLowerCase();
    }
  }

  return null;
};

const isPaymentResponseSuccessful = (paymentResponse: { success?: boolean; data?: unknown; message?: string }) => {
  const transactionStatus = extractTransactionStatus(paymentResponse.data);

  if (transactionStatus) {
    const successStatuses = new Set(["0", "success", "succeeded", "paid", "completed", "complete"]);
    const failedStatuses = new Set(["1", "failed", "failure", "cancelled", "canceled", "declined", "error", "no"]);

    if (successStatuses.has(transactionStatus)) {
      return true;
    }

    if (failedStatuses.has(transactionStatus)) {
      return false;
    }
  }

  return Boolean(paymentResponse.success);
};

const assertPositiveAmount = (amount: number | null) => {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("resource_amount_invalid");
  }

  return amount;
};

export const getCommandeCheckoutPageData = async (
  category: CommandeCategory,
  resourceId: string,
): Promise<CommandePageData> => {
  const [student, resource] = await Promise.all([resolveCurrentStudent(), getResourceSummary(category, resourceId)]);

  await assertStudentCanAccessResource(student.id, resource.programmeId);

  const existingSuccessCommande = await getExistingSuccessCommande(student.id, category, resourceId);

  return {
    student,
    resource,
    existingSuccessCommande,
  };
};

export const getProductPath = (category: CommandeCategory, resourceId: string) => `/product/${category}/${resourceId}`;

export const getCommandePath = (category: CommandeCategory, resourceId: string) => `/commande/${category}/${resourceId}`;

export const getProductRenderMode = (category: CommandeCategory): ProductRenderMode => {
  switch (category) {
    case "session":
      return "form";
    case "documents":
      return "document";
    case "stages":
    case "sujets":
    case "laboratoire":
      return "message";
    default:
      return "message";
  }
};

export const getProductPageData = async (
  category: CommandeCategory,
  resourceId: string,
): Promise<ProductPageData> => {
  const checkoutData = await getCommandeCheckoutPageData(category, resourceId);

  return {
    ...checkoutData,
    renderMode: getProductRenderMode(category),
    commandePath: getCommandePath(category, resourceId),
    productPath: getProductPath(category, resourceId),
    hasPaidAccess: checkoutData.existingSuccessCommande !== null,
  };
};

export const createCommandeDraft = async (input: CreateCommandeDraftInput): Promise<DraftCommandeResult> => {
  const student = await resolveCurrentStudent();
  const resource = await getResourceSummary(input.category, input.resourceId);
  const amount = assertPositiveAmount(resource.amount);

  await assertStudentCanAccessResource(student.id, resource.programmeId);

  const existingSuccessCommande = await getExistingSuccessCommande(student.id, input.category, input.resourceId);

  if (existingSuccessCommande) {
    throw new Error("commande_already_paid");
  }

  if (input.channel === "MOBILE_MONEY" && !normalizeText(input.phone)) {
    throw new Error("phone_required");
  }

  const admin = createAdminClient();
  const latestPendingCommande = await getLatestPendingCommande(student.id, input.category, input.resourceId);
  const payload = {
    product: resource.id,
    categorie: input.category,
    student_id: student.id,
    orderNumber: null,
    total: amount,
    status: "pending",
    description: buildCommandeDescription(resource, input.channel, input.description),
  };

  if (latestPendingCommande) {
    const { data, error } = await admin
      .from("commande")
      .update(payload)
      .eq("id", latestPendingCommande.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      commande: data as CommandeRecord,
      resource,
      student,
    };
  }

  const { data, error } = await admin.from("commande").insert(payload).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    commande: data as CommandeRecord,
    resource,
    student,
  };
};

export const confirmCommandePayment = async (input: ConfirmCommandePaymentInput): Promise<ConfirmCommandeResult> => {
  const student = await resolveCurrentStudent();
  const resource = await getResourceSummary(input.category, input.resourceId);
  const amount = assertPositiveAmount(resource.amount);

  await assertStudentCanAccessResource(student.id, resource.programmeId);

  const categoryAliases = getCommandeCategoryAliases(input.category);
  const admin = createAdminClient();
  const { data: commandeData, error: commandeError } = await admin
    .from("commande")
    .select("*")
    .eq("id", input.commandeId)
    .eq("student_id", student.id)
    .in("categorie", categoryAliases)
    .eq("product", input.resourceId)
    .maybeSingle();

  if (commandeError) {
    throw new Error(commandeError.message);
  }

  if (!commandeData) {
    throw new Error("commande_not_found");
  }

  const commande = commandeData as CommandeRecord;

  if (commande.status === "success") {
    throw new Error("commande_already_paid");
  }

  if (input.channel === "MOBILE_MONEY") {
    const phone = normalizeText(input.phone);

    if (!phone) {
      throw new Error("phone_required");
    }
  }

  const paymentService = PaymentService.getInstance();
  const reference = commande.id;
  const paymentResponse =
    input.channel === "MOBILE_MONEY"
      ? await paymentService.collect({
          channel: "MOBILE_MONEY",
          amount,
          currency: "USD",
          reference,
          phone: normalizeText(input.phone) ?? "",
        })
      : await paymentService.collect({
          channel: "CREDIT_CARD",
          amount,
          currency: "USD",
          reference,
          description: normalizeText(input.description) ?? `Paiement ${resource.title}`,
        });

  const resolvedOrderNumber = extractOrderNumber(paymentResponse.data) ?? reference;
  const description = buildCommandeDescription(resource, input.channel, input.description);
  const { data: updatedCommande, error: updateError } = await admin
    .from("commande")
    .update({
      orderNumber: resolvedOrderNumber,
      status: "pending",
      total: amount,
      description,
    })
    .eq("id", commande.id)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  await createOrUpdatePendingPaiement({
    studentId: student.id,
    category: input.category,
    resource,
    amount,
    orderNumber: resolvedOrderNumber,
    description,
  });

  return {
    commande: updatedCommande as CommandeRecord,
    message: paymentResponse.message ?? "La commande a ete initiee.",
    provider: paymentResponse.provider ?? null,
    orderNumber: resolvedOrderNumber,
    rawData: paymentResponse.data,
  };
};

export const createManualPaiementRequest = async (
  input: CreateManualPaiementRequestInput,
): Promise<ManualPaiementRequestResult> => {
  const student = await resolveCurrentStudent();
  const resource = await getResourceSummary(input.category, input.resourceId);
  const amount = assertPositiveAmount(resource.amount);

  await assertStudentCanAccessResource(student.id, resource.programmeId);

  const existingSuccessCommande = await getExistingSuccessCommande(student.id, input.category, input.resourceId);

  if (existingSuccessCommande) {
    throw new Error("commande_already_paid");
  }

  const admin = createAdminClient();
  const latestPendingCommande = await getLatestPendingCommande(student.id, input.category, input.resourceId);
  const orderNumber = normalizeText(latestPendingCommande?.orderNumber) ?? buildManualOrderNumber(input.category);
  const description = buildCommandeDescription(resource, "MOBILE_MONEY", input.description ?? "Paiement manuel au bureau");
  const payload = {
    product: resource.id,
    categorie: input.category,
    student_id: student.id,
    orderNumber,
    total: amount,
    status: "pending",
    description,
  };

  let commande: CommandeRecord;

  if (latestPendingCommande) {
    const { data, error } = await admin.from("commande").update(payload).eq("id", latestPendingCommande.id).select("*").single();

    if (error) {
      throw new Error(error.message);
    }

    commande = data as CommandeRecord;
  } else {
    const { data, error } = await admin.from("commande").insert(payload).select("*").single();

    if (error) {
      throw new Error(error.message);
    }

    commande = data as CommandeRecord;
  }

  await createOrUpdatePendingPaiement({
    studentId: student.id,
    category: input.category,
    resource,
    amount,
    orderNumber,
    description,
  });

  return {
    commande,
    resource,
    student,
    orderNumber,
    invoicePath: `/commande/order/${encodeURIComponent(orderNumber)}/invoice`,
    message: "Bon de commande genere. Presentez-le au bureau pour la validation du paiement manuel.",
  };
};

export const validateStudentCommandePayment = async (input: {
  commandeId: string;
  category: CommandeCategory;
  resourceId: string;
}): Promise<PaymentValidationResult> => {
  const student = await resolveCurrentStudent();
  const resource = await getResourceSummary(input.category, input.resourceId);

  await assertStudentCanAccessResource(student.id, resource.programmeId);

  const categoryAliases = getCommandeCategoryAliases(input.category);
  const admin = createAdminClient();
  const { data: commandeData, error: commandeError } = await admin
    .from("commande")
    .select("*")
    .eq("id", input.commandeId)
    .eq("student_id", student.id)
    .in("categorie", categoryAliases)
    .eq("product", input.resourceId)
    .maybeSingle();

  if (commandeError) {
    throw new Error(commandeError.message);
  }

  if (!commandeData) {
    throw new Error("commande_not_found");
  }

  const commande = commandeData as CommandeRecord;
  const previousStatus = commande.status;
  const orderNumber = normalizeText(commande.orderNumber) ?? commande.id;
  const paymentService = PaymentService.getInstance();
  const paymentResponse = await paymentService.check(orderNumber);
  const isSuccess = isPaymentResponseSuccessful(paymentResponse);
  const desiredStatus = isSuccess ? "success" : "no";

  const { data: updatedCommande, error: updateError } = await admin
    .from("commande")
    .update({ status: desiredStatus })
    .eq("id", commande.id)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  const orderRef = normalizeText((updatedCommande as CommandeRecord).orderNumber) ?? (updatedCommande as CommandeRecord).id;
  await updatePaiementStatusByOrderNumber(orderRef, isSuccess ? "success" : "no");

  if (isSuccess && previousStatus !== "success") {
    try {
      await notifyOrganizersWhenCommandeSuccess(updatedCommande as CommandeRecord);
    } catch (notificationError) {
      console.error("organizer notification failed", notificationError);
    }
  }

  return {
    success: isSuccess,
    message: isSuccess
      ? "Paiement confirme. La ressource est maintenant accessible."
      : "Paiement non confirme pour le moment. Vous pouvez relancer la verification.",
    commande: updatedCommande as CommandeRecord,
    paymentResponse: paymentResponse.data ?? null,
    category: input.category,
    productId: input.resourceId,
    productPath: getProductPath(input.category, input.resourceId),
    commandePath: getCommandePath(input.category, input.resourceId),
  };
};

export const validateCommandePaymentByOrderNumber = async (orderNumber: string): Promise<PaymentValidationResult> => {
  const normalizedOrderNumber = normalizeText(orderNumber);

  if (!normalizedOrderNumber) {
    throw new Error("order_number_required");
  }

  const admin = createAdminClient();
  const { data: commandeData, error: commandeError } = await admin
    .from("commande")
    .select("*")
    .eq("orderNumber", normalizedOrderNumber)
    .maybeSingle();

  if (commandeError) {
    throw new Error(commandeError.message);
  }

  if (!commandeData) {
    throw new Error("commande_not_found");
  }

  const commande = commandeData as CommandeRecord;
  const previousStatus = commande.status;
  const rawCategory = normalizeCommandeCategoryValue(commande.categorie);
  const activityCategory = normalizeActivityCommandeCategory(commande.categorie);
  const productId = normalizeText(commande.product);

  if ((!rawCategory && !activityCategory) || !productId) {
    throw new Error("commande_resource_invalid");
  }

  const paymentService = PaymentService.getInstance();
  const paymentResponse = await paymentService.check(normalizedOrderNumber);
  const isSuccess = isPaymentResponseSuccessful(paymentResponse);
  const desiredStatus = isSuccess ? "success" : "no";

  const { data: updatedCommande, error: updateError } = await admin
    .from("commande")
    .update({ status: desiredStatus })
    .eq("id", commande.id)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  await updatePaiementStatusByOrderNumber(normalizedOrderNumber, isSuccess ? "success" : "no");

  if (isSuccess && previousStatus !== "success") {
    try {
      await notifyOrganizersWhenCommandeSuccess(updatedCommande as CommandeRecord);
    } catch (notificationError) {
      console.error("organizer notification failed", notificationError);
    }
  }

  if (activityCategory) {
    const { data: activityData, error: activityError } = await admin
      .from("activity")
      .select("cours_id, slug, entra_id")
      .eq("id", productId)
      .maybeSingle();

    if (activityError) {
      throw new Error(activityError.message);
    }

    const activity = activityData as { cours_id?: string | null; slug?: string | null; entra_id?: string | null } | null;
    const courseId = normalizeText(activity?.cours_id);

    if (!courseId) {
      throw new Error("activity_course_missing");
    }

    const { data: courseData, error: courseError } = await admin
      .from("cours")
      .select("matiere_id")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError) {
      throw new Error(courseError.message);
    }

    const course = courseData as { matiere_id?: string | null } | null;
    const matiereId = normalizeText(course?.matiere_id);

    if (!matiereId) {
      throw new Error("activity_course_missing");
    }

    if (isSuccess) {
      const studentId = normalizeText((updatedCommande as CommandeRecord).student_id);
      if (!studentId) {
        throw new Error("commande_student_missing");
      }

      await upsertActivityCommandeTrackingRow({
        admin,
        activityId: productId,
        studentId,
        status: "success",
        slug: normalizeText(activity?.slug),
        entraId: normalizeText(activity?.entra_id),
      });
    }

    return {
      success: isSuccess,
      message: isSuccess
        ? "Le paiement a ete confirme par FlexPay."
        : "La transaction n'a pas pu etre confirmee. Le statut de la commande passe en « no ».",
      commande: updatedCommande as CommandeRecord,
      paymentResponse,
      category: activityCategory,
      productId,
      productPath: `/cours/${matiereId}/${activityCategory}/${productId}`,
      commandePath: `/commande/order/${encodeURIComponent(normalizedOrderNumber)}`,
    };
  }

  const resourceCategory = rawCategory as CommandeCategory;

  return {
    success: isSuccess,
    message: isSuccess
      ? "Le paiement a ete confirme par FlexPay."
      : "La transaction n'a pas pu etre confirmee. Le statut de la commande passe en « no ».",
    commande: updatedCommande as CommandeRecord,
    paymentResponse,
    category: resourceCategory,
    productId,
    productPath: getProductPath(resourceCategory, productId),
    commandePath: getCommandePath(resourceCategory, productId),
  };
};

export const getCommandeCategoryLabel = (category: CommandeCategory) => resourceConfig[category].label;

export const getCommandeStudentDisplayName = getStudentDisplayName;
