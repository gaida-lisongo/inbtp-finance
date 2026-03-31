import { PaymentService } from "@/lib/services/PaymentService";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getCurrentAuthenticatedStudent, type CommandeRecord, type PaymentChannel } from "@/lib/utils/supabase/commandes";
import type { CoursRecord, MatiereRecord, SemestreRecord, UniteRecord } from "@/lib/utils/supabase/enseignement";
import { getStudentCoursePageData } from "@/lib/utils/supabase/student-teaching";
import type { StudentRecord } from "@/lib/utils/supabase/students-shared";

type AgentSummary = {
  id: string;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  email: string | null;
  role: string | null;
};

export type ActivityCategory = "tp" | "qcm" | "ressource";

export type ActivityRecord = {
  id: string;
  created_at: string;
  categorie: string | null;
  cours_id: string | null;
  designation: string | null;
  description: string | null;
  montant: number | null;
  slug: string | null;
  entra_id: string | null;
  note: number | null;
  date_limite: string | null;
  is_active: string | null;
};

export type CourseDetailRecord = CoursRecord & {
  description: unknown;
  plan: unknown;
  objectifs: unknown;
  methodologies: unknown;
  penalites: unknown;
  competences: unknown;
  disponiblites: unknown;
};

export type StudentCoursePageDetails = Awaited<ReturnType<typeof getStudentCoursePageData>> & {
  cours: {
    record: CourseDetailRecord | null;
    titulaire: AgentSummary | null;
    description: unknown;
    plan: unknown;
    objectifs: unknown;
    methodologies: unknown;
    penalites: unknown;
    competences: unknown;
    disponibilites: unknown;
  };
  activities: Array<
    ActivityRecord & {
      category: ActivityCategory;
      existingSuccessCommande: CommandeRecord | null;
      activityPath: string;
    }
  >;
};

type ActivityDraftInput = {
  activityId: string;
  channel: PaymentChannel;
  phone?: string | null;
  description?: string | null;
};

type ActivityConfirmInput = ActivityDraftInput & {
  commandeId: string;
};

type ActivityDraftResult = {
  commande: CommandeRecord;
  activity: ActivityRecord;
  student: Pick<StudentRecord, "id" | "email" | "telephone" | "nom" | "post_nom" | "prenom" | "grade">;
};

type ActivityConfirmResult = {
  commande: CommandeRecord;
  activity: ActivityRecord;
  orderNumber: string;
  message: string;
  provider: string | null;
  rawData: unknown;
};

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const normalizeActivityCategory = (value: string | null | undefined): ActivityCategory | null => {
  const normalized = normalizeText(value)?.toLowerCase();

  if (normalized === "tp" || normalized === "qcm" || normalized === "ressource") {
    return normalized;
  }

  return null;
};

const assertPositiveAmount = (amount: number | null) => {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("activity_amount_invalid");
  }

  return amount;
};

const getActivityById = async (activityId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("activity").select("*").eq("id", activityId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("activity_not_found");
  }

  const activity = data as ActivityRecord;
  const category = normalizeActivityCategory(activity.categorie);

  if (!category) {
    throw new Error("activity_category_invalid");
  }

  return {
    ...activity,
    category,
  };
};

const getCourseContextFromActivity = async (activity: ActivityRecord) => {
  if (!activity.cours_id) {
    throw new Error("activity_course_missing");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("cours").select("slug, matiere_id").eq("id", activity.cours_id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const courseData = data as { slug?: string | null; matiere_id?: string | null } | null;

  if (!courseData?.matiere_id) {
    throw new Error("activity_course_missing");
  }

  const coursePageData = await getStudentCoursePageData(courseData.matiere_id);

  return {
    label: normalizeText(coursePageData.matiere.designation) ?? normalizeText(courseData.slug) ?? "Cours",
    matiereId: courseData.matiere_id,
  };
};

const getExistingSuccessCommande = async (studentId: string, activityId: string, category: ActivityCategory) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commande")
    .select("*")
    .eq("student_id", studentId)
    .eq("categorie", category)
    .eq("product", activityId)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (((data ?? []) as CommandeRecord[])[0] ?? null) as CommandeRecord | null;
};

const getLatestPendingCommande = async (studentId: string, activityId: string, category: ActivityCategory) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commande")
    .select("*")
    .eq("student_id", studentId)
    .eq("categorie", category)
    .eq("product", activityId)
    .neq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (((data ?? []) as CommandeRecord[])[0] ?? null) as CommandeRecord | null;
};

const buildActivityDescription = (activity: ActivityRecord, courseTitle: string, channel: PaymentChannel, customDescription?: string | null) => {
  return [
    `Commande activité ${activity.categorie ?? "cours"}`,
    normalizeText(activity.designation),
    normalizeText(courseTitle),
    channel === "MOBILE_MONEY" ? "Mobile Money" : "Carte bancaire",
    normalizeText(customDescription),
  ]
    .filter(Boolean)
    .join(" - ");
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

  for (const nestedKey of ["data", "payload", "result"]) {
    const nested = extractOrderNumber(record[nestedKey]);

    if (nested) {
      return nested;
    }
  }

  return null;
};

export const getCourseActivityPath = (matiereId: string, category: ActivityCategory, activityId: string) =>
  `/cours/${matiereId}/${category}/${activityId}`;

export const getStudentCourseDetails = async (matiereId: string): Promise<StudentCoursePageDetails> => {
  const admin = createAdminClient();
  const base = await getStudentCoursePageData(matiereId);

  const courseRecord = base.matiere.cours;
  let course: CourseDetailRecord | null = null;
  let titulaire: AgentSummary | null = null;
  let activities: StudentCoursePageDetails["activities"] = [];

  if (courseRecord?.id) {
    const [{ data: courseData, error: courseError }, { data: titulaireData, error: titulaireError }, { data: activityData, error: activityError }] =
      await Promise.all([
        admin
          .from("cours")
          .select("id, created_at, matiere_id, titulaire_id, description, plan, objectifs, methodologies, penalites, competences, disponiblites, slug, entra_id")
          .eq("id", courseRecord.id)
          .maybeSingle(),
        courseRecord.titulaire_id
          ? admin.from("agents").select("id, nom, post_nom, prenom, email, role").eq("id", courseRecord.titulaire_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        admin.from("activity").select("*").eq("cours_id", courseRecord.id).order("created_at", { ascending: true }),
      ]);

    if (courseError) {
      throw new Error(courseError.message);
    }

    if (titulaireError) {
      throw new Error(titulaireError.message);
    }

    if (activityError) {
      throw new Error(activityError.message);
    }

    course = (courseData ?? null) as CourseDetailRecord | null;
    titulaire = (titulaireData ?? null) as AgentSummary | null;

    const rawActivities = ((activityData ?? []) as ActivityRecord[])
      .map((activity) => ({
        ...activity,
        category: normalizeActivityCategory(activity.categorie),
      }))
      .filter((activity): activity is ActivityRecord & { category: ActivityCategory } => activity.category !== null);

    activities = await Promise.all(
      rawActivities.map(async (activity) => ({
        ...activity,
        existingSuccessCommande: await getExistingSuccessCommande(base.student.id, activity.id, activity.category),
        activityPath: getCourseActivityPath(matiereId, activity.category, activity.id),
      })),
    );
  }

  return {
    ...base,
    cours: {
      record: course,
      titulaire,
      description: course?.description ?? null,
      plan: course?.plan ?? null,
      objectifs: course?.objectifs ?? null,
      methodologies: course?.methodologies ?? null,
      penalites: course?.penalites ?? null,
      competences: course?.competences ?? null,
      disponibilites: course?.disponiblites ?? null,
    },
    activities,
  };
};

export const createActivityCommandeDraft = async (input: ActivityDraftInput): Promise<ActivityDraftResult> => {
  const student = await getCurrentAuthenticatedStudent();
  const activity = await getActivityById(input.activityId);
  const courseContext = await getCourseContextFromActivity(activity);

  const amount = assertPositiveAmount(activity.montant);
  const existingSuccessCommande = await getExistingSuccessCommande(student.id, activity.id, activity.category);

  if (existingSuccessCommande) {
    throw new Error("commande_already_paid");
  }

  const latestPendingCommande = await getLatestPendingCommande(student.id, activity.id, activity.category);
  const payload = {
    product: activity.id,
    categorie: activity.category,
    student_id: student.id,
    total: amount,
    status: "pending",
    description: buildActivityDescription(
      activity,
      courseContext.label,
      input.channel,
      input.description,
    ),
  };

  const admin = createAdminClient();

  if (latestPendingCommande) {
    const { data, error } = await admin.from("commande").update(payload).eq("id", latestPendingCommande.id).select("*").single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      commande: data as CommandeRecord,
      activity,
      student,
    };
  }

  const { data, error } = await admin.from("commande").insert(payload).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    commande: data as CommandeRecord,
    activity,
    student,
  };
};

export const confirmActivityCommandePayment = async (input: ActivityConfirmInput): Promise<ActivityConfirmResult> => {
  const student = await getCurrentAuthenticatedStudent();
  const activity = await getActivityById(input.activityId);
  const courseContext = await getCourseContextFromActivity(activity);
  const amount = assertPositiveAmount(activity.montant);
  const existingSuccessCommande = await getExistingSuccessCommande(student.id, activity.id, activity.category);

  if (existingSuccessCommande) {
    throw new Error("commande_already_paid");
  }

  const admin = createAdminClient();
  const { data: commandeData, error: commandeError } = await admin
    .from("commande")
    .select("*")
    .eq("id", input.commandeId)
    .eq("student_id", student.id)
    .eq("product", activity.id)
    .eq("categorie", activity.category)
    .maybeSingle();

  if (commandeError) {
    throw new Error(commandeError.message);
  }

  if (!commandeData) {
    throw new Error("commande_not_found");
  }

  const paymentService = PaymentService.getInstance();
  const reference = (commandeData as CommandeRecord).id;
  const paymentResponse =
    input.channel === "MOBILE_MONEY"
      ? await paymentService.collect({
          channel: "MOBILE_MONEY",
          amount,
          currency: "USD",
          reference,
          phone: input.phone ?? student.telephone ?? "",
        })
      : await paymentService.collect({
          channel: "CREDIT_CARD",
          amount,
          currency: "USD",
          reference,
          description: normalizeText(input.description) ?? `Paiement ${activity.designation ?? "activité"}`,
        });

  const orderNumber = extractOrderNumber(paymentResponse.data) ?? reference;
  const { data: updatedCommande, error: updateError } = await admin
    .from("commande")
    .update({
      status: paymentResponse.success ? "pending" : "error",
      description: buildActivityDescription(
        activity,
        courseContext.label,
        input.channel,
        input.description,
      ),
      orderNumber,
    })
    .eq("id", reference)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    commande: updatedCommande as CommandeRecord,
    activity,
    orderNumber,
    message: paymentResponse.message ?? "La commande a ete initiee.",
    provider: paymentResponse.provider ?? null,
    rawData: paymentResponse.data,
  };
};

export const getActivityAccessPageData = async (matiereId: string, activityId: string, category: ActivityCategory) => {
  const course = await getStudentCourseDetails(matiereId);
  const activity = course.activities.find((item) => item.id === activityId && item.category === category) ?? null;

  if (!activity) {
    throw new Error("activity_not_found");
  }

  if (!activity.existingSuccessCommande) {
    throw new Error("activity_payment_required");
  }

  return {
    ...course,
    activity,
  };
};
