import { generateStageLetterPdfBuffer } from "@/lib/documents/stage-letter-pdf";
import type { DocumentStagePayload } from "@/lib/documents/stage-letter";
import { createAdminClient } from "@/lib/utils/supabase/admin";

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeCategory = (value: string | null) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const buildStudentName = (student: { prenom: string | null; post_nom: string | null; nom: string | null }) =>
  [student.prenom, student.post_nom, student.nom].filter(Boolean).join(" ").trim() || "Etudiant";

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

type CommandeRow = {
  id: string;
  created_at: string;
  product: string | null;
  categorie: string | null;
  student_id: string | null;
  orderNumber: string | null;
  status: string | null;
};

type StudentRow = {
  id: string;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
};

type StageRow = {
  id: string;
  slug: string | null;
};

type RecipientInput = {
  recipientName: string;
  recipientQuality: string;
  recipientSex: "M" | "F";
  companyName: string;
  companyLocation: string;
};

const assertStageCommande = (commande: CommandeRow) => {
  const category = normalizeCategory(commande.categorie);

  if (category !== "stage" && category !== "stages") {
    throw new Error("invalid_stage_commande");
  }

  if (commande.status !== "success") {
    throw new Error("stage_commande_not_paid");
  }

  if (!normalizeText(commande.student_id) || !normalizeText(commande.product)) {
    throw new Error("stage_commande_data_incomplete");
  }
};

const buildPayload = async (commande: CommandeRow, recipient: RecipientInput) => {
  assertStageCommande(commande);

  const admin = createAdminClient();
  const studentId = normalizeText(commande.student_id) as string;
  const stageId = normalizeText(commande.product) as string;

  const [{ data: studentData, error: studentError }, { data: stageData, error: stageError }] = await Promise.all([
    admin.from("students").select("id, nom, post_nom, prenom, email, telephone").eq("id", studentId).maybeSingle(),
    admin.from("stages").select("id, slug").eq("id", stageId).maybeSingle(),
  ]);

  if (studentError) {
    throw new Error(studentError.message);
  }

  if (!studentData) {
    throw new Error("student_not_found");
  }

  if (stageError) {
    throw new Error(stageError.message);
  }

  const student = studentData as StudentRow;
  const stage = (stageData ?? null) as StageRow | null;
  const orderReference = commande.orderNumber ?? commande.id;

  const payload: DocumentStagePayload = {
    stageTitle: stage?.slug ?? "Stage academique",
    student: {
      fullName: buildStudentName(student),
      email: student.email,
      telephone: student.telephone,
    },
    recipientName: recipient.recipientName,
    recipientQuality: recipient.recipientQuality,
    recipientSex: recipient.recipientSex,
    companyName: recipient.companyName,
    companyLocation: recipient.companyLocation,
    documentReference: orderReference,
  };

  return { payload, orderReference, studentId };
};

export const generateStageLetterPdfBufferFromCommandeId = async (input: { commandeId: string } & RecipientInput) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commande")
    .select('id, created_at, product, categorie, student_id, "orderNumber", status')
    .eq("id", input.commandeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("commande_not_found");
  }

  const commande = data as CommandeRow;
  const { payload, orderReference, studentId } = await buildPayload(commande, input);

  return {
    orderReference,
    studentId,
    buffer: await generateStageLetterPdfBuffer(payload, { orderReference, studentId }),
  };
};

export const generateStageLetterPdfBufferFromOrderReference = async (input: { orderReference: string; studentId: string } & RecipientInput) => {
  const admin = createAdminClient();
  const orderReferenceQuery = input.orderReference;
  const orClause = isUuid(orderReferenceQuery)
    ? `id.eq.${orderReferenceQuery},orderNumber.eq.${orderReferenceQuery}`
    : `orderNumber.eq.${orderReferenceQuery}`;
  const { data, error } = await admin
    .from("commande")
    .select('id, created_at, product, categorie, student_id, "orderNumber", status')
    .eq("student_id", input.studentId)
    .or(orClause)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const commande = ((data ?? []) as CommandeRow[])[0] ?? null;

  if (!commande) {
    throw new Error("commande_not_found");
  }

  const { payload, orderReference, studentId } = await buildPayload(commande, input);

  return {
    orderReference,
    studentId,
    buffer: await generateStageLetterPdfBuffer(payload, { orderReference, studentId }),
  };
};
