import { getChef } from "@/lib/documents/layout";
import { DocumentValidate } from "@/lib/documents";
import { generateStageLetterPdfBufferFromCommandeId } from "@/lib/utils/supabase/stage-letter-generation";
import { sendMicrosoft365Mail } from "@/lib/utils/microsoft-graph";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getDocumentCategory } from "@/lib/utils/supabase/documents-shared";
import { getNotesForProgramme } from "@/lib/utils/supabase/jury";
import { getProgrammeById } from "@/lib/utils/supabase/programmes";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getStudentDisplayName } from "@/lib/utils/supabase/students-shared";
import { NoteManager } from "@/utils/excel/NoteManager";
import PdfDocumentReleve from "@/utils/pdf/DocumentReleve";

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
  ville: string | null;
  date_naissance: string | null;
  telephone: string | null;
};

const parseBirthDate = (record: Record<string, unknown>) => {
  const candidates = [
    record.date_naissance,
    record.date_naiss,
    record.dateNaissance,
    record.dateNaiss,
    record.naissance,
    record.birth_date,
  ];

  for (const value of candidates) {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  return null;
};

type ProgrammeRow = {
  id: string;
  designation: string | null;
};

type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  documentCategory: string | null;
};

type CommandeCategory = "documents" | "session" | "stages" | "sujets" | "laboratoire";
type CommandeStatus = "pending" | "success" | "no";

export type FacultyCommandeDetail = {
  commande: CommandeRow & { categoryKey: CommandeCategory | null };
  student: {
    id: string;
    displayName: string;
    email: string | null;
    ville: string | null;
    date_naissance: string | null;
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

const appBaseUrl = process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "");

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
    const caracteristique = normalizeText((data as { caracteristique?: Record<string, unknown> | null }).caracteristique?.["categorie"] as string | null);
    return { id: productId, title: designation, description, documentCategory: caracteristique };
  }

  if (category === "session") {
    const designation = normalizeText((data as { designation?: string | null }).designation) ?? `Session ${productId}`;
    const description = normalizeText((data as { description?: string | null }).description);
    const caracteristique = normalizeText((data as { caracteristique?: Record<string, unknown> | null }).caracteristique?.["categorie"] as string | null);
    return { id: productId, title: designation, description, documentCategory: caracteristique };
  }

  const slug = normalizeText((data as { slug?: string | null }).slug) ?? `${category} ${productId}`;
  const descriptionRaw = (data as { description?: unknown }).description;
  const description =
    typeof descriptionRaw === "string"
      ? normalizeText(descriptionRaw)
      : descriptionRaw && typeof descriptionRaw === "object" && "text" in (descriptionRaw as Record<string, unknown>)
        ? normalizeText(String((descriptionRaw as Record<string, unknown>).text ?? ""))
        : null;

  return { id: productId, title: slug, description, documentCategory: null };
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
    ? admin.from("students").select("id, nom, post_nom, prenom, ville, date_naissance, email, telephone").eq("id", studentId).maybeSingle()
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

  console.log("Student record :", studentRecord);
  
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
          ville: studentRecord.ville,
          date_naissance: studentRecord.date_naissance,
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
  await assertCsAdminAccess();
  const result = await generateStageLetterPdfBufferFromCommandeId(input);

  return {
    filename: `lettre-stage-${result.orderReference}.pdf`,
    buffer: result.buffer,
  };
};

export const generateValidationSheetForFaculty = async (commandeId: string) => {
  const detail = await getFacultyCommandeDetail(commandeId);

  if (detail.commande.categoryKey !== "documents") {
    throw new Error("invalid_validation_commande");
  }

  if (detail.commande.status !== "success") {
    throw new Error("validation_commande_not_paid");
  }

  if (!detail.student) {
    throw new Error("validation_commande_data_incomplete");
  }

  const productId = normalizeText(detail.commande.product);

  if (!productId) {
    throw new Error("validation_document_missing");
  }

  const admin = createAdminClient();
  const { data: documentData, error: documentError } = await admin
    .from("documents")
    .select("id, programme_id, caracteristique")
    .eq("id", productId)
    .maybeSingle();

  if (documentError) {
    throw new Error(documentError.message);
  }

  if (!documentData) {
    throw new Error("validation_document_missing");
  }

  const documentCategory = getDocumentCategory({
    caracteristique:
      documentData.caracteristique && typeof documentData.caracteristique === "object"
        ? (documentData.caracteristique as Record<string, unknown>)
        : null,
  });

  if (documentCategory.trim().toLowerCase() !== "fiche de validation") {
    throw new Error("invalid_validation_document");
  }

  const programmeId = normalizeText((documentData as { programme_id?: string | null }).programme_id);

  if (!programmeId) {
    throw new Error("validation_programme_missing");
  }

  const [programme, notes] = await Promise.all([getProgrammeById(programmeId), getNotesForProgramme(programmeId)]);
  const studentResult = NoteManager.calculerResultatsPromotion(notes).find((item) => item.studentId === detail.student?.id) ?? null;

  if (!studentResult) {
    throw new Error("validation_notes_missing");
  }

  const orderReference = detail.commande.orderNumber ?? detail.commande.id;
  const verificationBaseUrl = appBaseUrl ?? "http://localhost:3000";
  const verificationUrl = `${verificationBaseUrl}/api/checking/validation/${productId}?student_id=${encodeURIComponent(detail.student.id)}&order=${encodeURIComponent(orderReference)}`;

  const semestres = studentResult.semestres.map((semestre) => {
    const unites = semestre.unites.map((unite) => ({
      code: unite.code,
      designation: unite.designation,
      statut: unite.isValide ? ("V" as const) : ("NV" as const),
      credit: unite.credit,
      matieres: unite.elements.map((element) => ({
        designation: element.designation,
        credit: element.credit,
      })),
    }));

    const casserolesCount = semestre.unites.reduce(
      (sum, unite) => sum + unite.elements.filter((element) => element.noteFinale < 10).length,
      0,
    );

    return {
      designation: semestre.designation,
      totalCredits: semestre.credit,
      unites,
      validatedCredits: semestre.ncv,
      nonValidatedCredits: semestre.ncnv,
      casserolesCount,
    };
  });

  const document = new DocumentValidate({
    studentName: detail.student.displayName,
    studentEmail: detail.student.email,
    studentPhone: detail.student.telephone,
    matricule: studentResult.matricule || "Non renseigne",
    programmeName: programme?.designation ?? "Promotion",
    orderReference,
    semestres,
    verificationUrl,
  });

  return {
    filename: `fiche-validation-${orderReference}.pdf`,
    buffer: await document.generateBuffer(),
  };
};

export const generateReleveForFaculty = async (commandeId: string) => {
  const detail = await getFacultyCommandeDetail(commandeId);

  if (detail.commande.categoryKey !== "documents") {
    throw new Error("invalid_releve_commande");
  }

  if (detail.commande.status !== "success") {
    throw new Error("releve_commande_not_paid");
  }

  if (!detail.student) {
    throw new Error("releve_commande_data_incomplete");
  }

  const productId = normalizeText(detail.commande.product);

  if (!productId) {
    throw new Error("releve_document_missing");
  }

  const admin = createAdminClient();
  const { data: documentData, error: documentError } = await admin
    .from("documents")
    .select("id, programme_id, caracteristique")
    .eq("id", productId)
    .maybeSingle();

  if (documentError) {
    throw new Error(documentError.message);
  }

  if (!documentData) {
    throw new Error("releve_document_missing");
  }

  const documentCategory = getDocumentCategory({
    caracteristique:
      documentData.caracteristique && typeof documentData.caracteristique === "object"
        ? (documentData.caracteristique as Record<string, unknown>)
        : null,
  });

  const normalizedDocCategory = documentCategory.trim().toLowerCase();
  if (!normalizedDocCategory.includes("relev")) {
    throw new Error("invalid_releve_document");
  }

  const programmeId = normalizeText((documentData as { programme_id?: string | null }).programme_id);

  if (!programmeId) {
    throw new Error("releve_programme_missing");
  }

  const [programme, notes] = await Promise.all([
    getProgrammeById(programmeId),
    getNotesForProgramme(programmeId),
  ]);
  const studentResult =
    NoteManager.calculerResultatsPromotion(notes).find((item) => item.studentId === detail.student?.id) ?? null;

  if (!studentResult) {
    throw new Error("releve_notes_missing");
  }

  const orderReference = detail.commande.orderNumber ?? detail.commande.id;
  const verificationBaseUrl = appBaseUrl ?? "http://localhost:3000";
  const verificationUrl = `${verificationBaseUrl}/checking/releve/${productId}?student_id=${encodeURIComponent(
    detail.student.id,
  )}&order=${encodeURIComponent(orderReference)}`;
  const serialRaw = `${orderReference}${productId}`.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const serialNumber = serialRaw.length >= 14 ? serialRaw.slice(-14) : serialRaw.padStart(14, "0");

  const units = studentResult.semestres.flatMap((semestre) =>
    semestre.unites.map((unite) => ({
      semestre: semestre.designation,
      code: unite.code,
      designation: unite.designation,
      statut: unite.isValide ? ("V" as const) : ("NV" as const),
      credit: unite.credit,
      moyenne: unite.sessions.best.moyenne,
      elements: (unite.elements ?? []).map((element) => ({
        designation: element.designation,
        credit: element.credit,
        cc: element.cc,
        examen: element.examen,
        noteSession: element.noteSession,
        rattrapage: element.rattrapage,
        rachat: element.rachat,
        noteFinale: element.noteFinale,
      })),
    })),
  );

  const bestSummary = studentResult.promotion;
  const decision = bestSummary.mention === "F" ? "Ajourné" : "Admis";

  const adminStudentPromise = admin.from("students").select("*").eq("id", detail.student.id).maybeSingle();
  const adminYearPromise = programme?.annee_id
    ? admin.from("annees").select("designation").eq("id", programme.annee_id).maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [{ data: rawStudentData, error: rawStudentError }, { data: anneeData, error: anneeError }] = await Promise.all([
    adminStudentPromise,
    adminYearPromise,
  ]);

  if (rawStudentError) {
    throw new Error(rawStudentError.message);
  }

  if (anneeError) {
    throw new Error(anneeError.message);
  }

  const rawStudentRecord = (rawStudentData ?? null) as Record<string, unknown> | null;
  const studentVille =
    rawStudentRecord && typeof rawStudentRecord.ville === "string" && rawStudentRecord.ville.trim().length > 0
      ? rawStudentRecord.ville.trim()
      : "Non renseigne";
  console.log("Ville: ", detail.student);
  const studentDateNaiss = rawStudentRecord ? parseBirthDate(rawStudentRecord) : null;
  const anneeAcad =
    typeof (anneeData as { designation?: string | null } | null)?.designation === "string" &&
    (anneeData as { designation?: string | null }).designation?.trim()
      ? ((anneeData as { designation: string }).designation.trim() as string)
      : "Non renseignee";

  const payload = {
    studentName: detail.student.displayName,
    studentVille,
    studentDateNaiss: studentDateNaiss ?? new Date("1970-01-01"),
    studentEmail: detail.student.email,
    studentPhone: detail.student.telephone,
    matricule: studentResult.matricule || "Non renseigne",
    programmeName: programme?.designation ?? "Promotion",
    anneeAcad,
    orderReference,
    serialNumber,
    units,
    summary: {
      ncv: bestSummary.ncv,
      ncnv: bestSummary.ncnv,
      totalObtenu: bestSummary.totalObtenu,
      totalMax: bestSummary.totalMax,
      pourcentage: bestSummary.pourcentage,
      mention: bestSummary.mention,
      decision,
    },
    verificationUrl,
  };

  const document = new PdfDocumentReleve(payload);
  document.info({
    title: `Releve de cotes - ${payload.studentName}`,
    author: "Dashboard Agents",
    subject: "Bulletin de notes",
    keywords: "releve, bulletin, note, credits",
  });

  await document.generate(verificationUrl, { nom: getChef(), titre: "Chef de Section" });

  return {
    filename: `bulletin-${orderReference}.pdf`,
    buffer: await document.generateBuffer(),
  };
};
