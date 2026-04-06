import { DocumentStage } from "@/lib/documents";
import { sendMicrosoft365Mail } from "@/lib/utils/microsoft-graph";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getStudentDisplayName } from "@/lib/utils/supabase/students-shared";

type CommandeRow = {
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

type StudentRow = {
  id: string;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
};

type ProgrammeRow = {
  id: string;
  designation: string | null;
};

type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
};

type CommandeCategory = "documents" | "session" | "stages" | "sujets" | "laboratoire";
type CommandeStatus = "pending" | "success" | "no";

export type FacultyCommandeDetail = {
  commande: CommandeRow & { categoryKey: CommandeCategory | null };
  student: {
    id: string;
    displayName: string;
    email: string | null;
    telephone: string | null;
  } | null;
  programme: ProgrammeRow | null;
  resource: ResourceRow | null;
};

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeCategory = (value: string | null): CommandeCategory | null => {
  const normalized = normalizeText(value)?.toLowerCase();

  if (normalized === "documents" || normalized === "session" || normalized === "stages" || normalized === "sujets" || normalized === "laboratoire") {
    return normalized;
  }

  return null;
};

const mapCategoryToTable = (category: CommandeCategory) => {
  switch (category) {
    case "documents":
      return "documents";
    case "session":
      return "session";
    case "stages":
      return "stages";
    case "sujets":
      return "sujets";
    case "laboratoire":
      return "laboratoires";
    default:
      return "documents";
  }
};

const assertCsAdminAccess = async () => {
  const user = await getAuthenticatedUser();

  if (!user || user.activePersona !== "admin" || !user.agentId) {
    throw new Error("access_denied");
  }

  const codes = await getActiveAutorisationCodesForAgent(user.agentId);

  if (!codes.includes("CS")) {
    throw new Error("access_denied");
  }
};

const resolveResourceRow = async (category: CommandeCategory, productId: string): Promise<ResourceRow | null> => {
  const admin = createAdminClient();
  const table = mapCategoryToTable(category);
  const { data, error } = await admin.from(table).select("*").eq("id", productId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  if (category === "documents") {
    const designation = normalizeText((data as { designation?: string | null }).designation) ?? `Document ${productId}`;
    const description = normalizeText((data as { description?: string | null }).description);
    return { id: productId, title: designation, description };
  }

  if (category === "session") {
    const designation = normalizeText((data as { designation?: string | null }).designation) ?? `Session ${productId}`;
    const description = normalizeText((data as { description?: string | null }).description);
    return { id: productId, title: designation, description };
  }

  const slug = normalizeText((data as { slug?: string | null }).slug) ?? `${category} ${productId}`;
  const descriptionRaw = (data as { description?: unknown }).description;
  const description =
    typeof descriptionRaw === "string"
      ? normalizeText(descriptionRaw)
      : descriptionRaw && typeof descriptionRaw === "object" && "text" in (descriptionRaw as Record<string, unknown>)
        ? normalizeText(String((descriptionRaw as Record<string, unknown>).text ?? ""))
        : null;

  return { id: productId, title: slug, description };
};

const insertCommandeSuccessNotification = async (commande: CommandeRow) => {
  const admin = createAdminClient();
  const orderRef = normalizeText(commande.orderNumber) ?? commande.id;
  const category = normalizeText(commande.categorie) ?? "commande";

  const { error } = await admin.from("notifications").insert({
    student_id: commande.student_id,
    object: `Commande ${orderRef} confirmee`,
    description: `La commande ${orderRef} est passee au statut success (${category}).`,
    categorie: "commande_success",
    status: false,
    path: `/commande/order/${encodeURIComponent(orderRef)}`,
  });

  if (error) {
    console.error("faculty commande notification insert failed", error);
  }

  const { data: organizerRows, error: organizerError } = await admin
    .from("agents")
    .select("email")
    .eq("role", "organisateur");

  if (organizerError) {
    console.error("faculty commande organizer query failed", organizerError);
    return;
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

  await sendMicrosoft365Mail({
    to: recipients,
    subject: `Commande ${orderRef} validee avec succes`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px;color:#1f2937;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
          <div style="padding:20px 24px;background:#111827;color:#ffffff;">
            <h1 style="margin:0;font-size:22px;line-height:1.35;">Commande confirmee</h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 8px;font-size:15px;line-height:1.7;">
              La commande <strong>${orderRef}</strong> est desormais au statut <strong>success</strong>.
            </p>
            <p style="margin:0;font-size:14px;line-height:1.7;">Categorie: <strong>${category}</strong></p>
          </div>
        </div>
      </div>
    `,
  });
};

export const getFacultyCommandeDetail = async (commandeId: string): Promise<FacultyCommandeDetail> => {
  await assertCsAdminAccess();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commande")
    .select('id, created_at, product, categorie, student_id, "orderNumber", total, status, description')
    .eq("id", commandeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("commande_not_found");
  }

  const commande = data as CommandeRow;
  const categoryKey = normalizeCategory(commande.categorie);
  const studentId = normalizeText(commande.student_id);
  const productId = normalizeText(commande.product);

  const studentPromise = studentId
    ? admin.from("students").select("id, nom, post_nom, prenom, email, telephone").eq("id", studentId).maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const parcoursPromise = studentId
    ? admin.from("parcours").select("programme_id").eq("student_id", studentId).limit(1).maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const resourcePromise = categoryKey && productId ? resolveResourceRow(categoryKey, productId) : Promise.resolve(null);

  const [{ data: studentData, error: studentError }, { data: parcoursData, error: parcoursError }, resource] = await Promise.all([
    studentPromise,
    parcoursPromise,
    resourcePromise,
  ]);

  if (studentError) {
    throw new Error(studentError.message);
  }

  if (parcoursError) {
    throw new Error(parcoursError.message);
  }

  const studentRecord = (studentData ?? null) as StudentRow | null;
  const programmeId = normalizeText((parcoursData as { programme_id?: string | null } | null)?.programme_id);
  let programme: ProgrammeRow | null = null;

  if (programmeId) {
    const { data: programmeData, error: programmeError } = await admin
      .from("programmes")
      .select("id, designation")
      .eq("id", programmeId)
      .maybeSingle();

    if (programmeError) {
      throw new Error(programmeError.message);
    }

    programme = (programmeData ?? null) as ProgrammeRow | null;
  }

  return {
    commande: {
      ...commande,
      categoryKey,
    },
    student: studentRecord
      ? {
          id: studentRecord.id,
          displayName: getStudentDisplayName(studentRecord),
          email: studentRecord.email,
          telephone: studentRecord.telephone,
        }
      : null,
    programme,
    resource,
  };
};

export const updateFacultyCommandeStatus = async (commandeId: string, status: CommandeStatus) => {
  await assertCsAdminAccess();

  const admin = createAdminClient();
  const { data: currentData, error: currentError } = await admin
    .from("commande")
    .select('id, created_at, product, categorie, student_id, "orderNumber", total, status, description')
    .eq("id", commandeId)
    .maybeSingle();

  if (currentError) {
    throw new Error(currentError.message);
  }

  if (!currentData) {
    throw new Error("commande_not_found");
  }

  const current = currentData as CommandeRow;
  const { data: updatedData, error: updateError } = await admin
    .from("commande")
    .update({ status })
    .eq("id", commandeId)
    .select('id, created_at, product, categorie, student_id, "orderNumber", total, status, description')
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  const updated = updatedData as CommandeRow;

  if (status === "success" && current.status !== "success") {
    try {
      await insertCommandeSuccessNotification(updated);
    } catch (error) {
      console.error("faculty commande success notification failed", error);
    }
  }

  return updated;
};

export const generateStageLetterForFaculty = async (input: {
  commandeId: string;
  recipientName: string;
  recipientQuality: string;
  recipientSex: "M" | "F";
  companyName: string;
  companyLocation: string;
}) => {
  const detail = await getFacultyCommandeDetail(input.commandeId);

  if (detail.commande.categoryKey !== "stages") {
    throw new Error("invalid_stage_commande");
  }

  if (detail.commande.status !== "success") {
    throw new Error("stage_commande_not_paid");
  }

  if (!detail.student || !detail.resource) {
    throw new Error("stage_commande_data_incomplete");
  }

  const document = new DocumentStage({
    stageTitle: detail.resource.title,
    student: {
      fullName: detail.student.displayName,
      email: detail.student.email,
      telephone: detail.student.telephone,
    },
    recipientName: input.recipientName,
    recipientQuality: input.recipientQuality,
    recipientSex: input.recipientSex,
    companyName: input.companyName,
    companyLocation: input.companyLocation,
    documentReference: detail.commande.orderNumber ?? detail.commande.id,
  });

  return {
    filename: `lettre-stage-${detail.commande.orderNumber ?? detail.commande.id}.pdf`,
    buffer: await document.generateBuffer(),
  };
};
