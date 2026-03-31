import { PaymentService } from "@/lib/services/PaymentService";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getDocumentCategory, type DocumentRecord } from "@/lib/utils/supabase/documents-shared";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import type { StudentRecord } from "@/lib/utils/supabase/students-shared";
import type { SessionRecord } from "@/lib/utils/supabase/appariteur";
import type { ResearchRecord } from "@/lib/utils/supabase/recherche-shared";

export type CommandeCategory = "documents" | "session" | "stages" | "sujets" | "laboratoire";
export type PaymentChannel = "MOBILE_MONEY" | "CREDIT_CARD";
export type PaymentCurrency = "USD";

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
  student: Pick<StudentRecord, "id" | "email" | "telephone" | "nom" | "post_nom" | "prenom">;
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

type DraftCommandeResult = {
  commande: CommandeRecord;
  resource: CommandeResourceSummary;
  student: Pick<StudentRecord, "id" | "email" | "telephone" | "nom" | "post_nom" | "prenom">;
};

type ConfirmCommandeResult = {
  commande: CommandeRecord;
  message: string;
  provider: string | null;
  orderNumber: string;
  rawData: unknown;
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
    .select("id, email, telephone, nom, post_nom, prenom, user_id")
    .ilike("email", normalizedEmail)
    .limit(1);

  if (studentByEmailError) {
    throw new Error(studentByEmailError.message);
  }

  const studentByEmail = (studentByEmailRows ?? [])[0];

  if (studentByEmail) {
    return studentByEmail as Pick<StudentRecord, "id" | "email" | "telephone" | "nom" | "post_nom" | "prenom">;
  }

  const { data: studentByUserIdRows, error: studentByUserIdError } = await admin
    .from("students")
    .select("id, email, telephone, nom, post_nom, prenom, user_id")
    .eq("user_id", user.id)
    .limit(1);

  if (studentByUserIdError) {
    throw new Error(studentByUserIdError.message);
  }

  const studentByUserId = (studentByUserIdRows ?? [])[0];

  if (studentByUserId) {
    return studentByUserId as Pick<StudentRecord, "id" | "email" | "telephone" | "nom" | "post_nom" | "prenom">;
  }

  throw new Error("student_not_found");
};

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
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commande")
    .select("*")
    .eq("student_id", studentId)
    .eq("categorie", category)
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
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commande")
    .select("*")
    .eq("student_id", studentId)
    .eq("categorie", category)
    .eq("product", resourceId)
    .neq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (((data ?? []) as CommandeRecord[])[0] ?? null) as CommandeRecord | null;
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

  const admin = createAdminClient();
  const { data: commandeData, error: commandeError } = await admin
    .from("commande")
    .select("*")
    .eq("id", input.commandeId)
    .eq("student_id", student.id)
    .eq("categorie", input.category)
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
  const { data: updatedCommande, error: updateError } = await admin
    .from("commande")
    .update({
      orderNumber: resolvedOrderNumber,
      status: "pending",
      total: amount,
      description: buildCommandeDescription(resource, input.channel, input.description),
    })
    .eq("id", commande.id)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    commande: updatedCommande as CommandeRecord,
    message: paymentResponse.message ?? "La commande a ete initiee.",
    provider: paymentResponse.provider ?? null,
    orderNumber: resolvedOrderNumber,
    rawData: paymentResponse.data,
  };
};

export const getCommandeCategoryLabel = (category: CommandeCategory) => resourceConfig[category].label;

export const getCommandeStudentDisplayName = getStudentDisplayName;
