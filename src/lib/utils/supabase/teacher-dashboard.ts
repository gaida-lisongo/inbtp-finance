import { createAdminClient } from "@/lib/utils/supabase/admin";
import type { FacultyDashboardCommande } from "@/lib/utils/supabase/faculte-dashboard";
import { getStudentDisplayName, type StudentRecord } from "@/lib/utils/supabase/students-shared";
import { getTeacherAssignedCourses } from "@/lib/utils/supabase/teacher-teaching";

type ActiveAnneeRecord = {
  id: string;
  designation: string | null;
  date_debut: string | null;
  date_fin: string | null;
  created_at: string;
  active: string | null;
};

type TeacherActivityRecord = {
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

type TeacherDashboardCommandeDetail = {
  id: string;
  createdAt: string;
  studentName: string;
  studentEmail: string | null;
  status: "success" | "pending";
  note: number | null;
  comment: string | null;
  montant: number;
};

export type TeacherDashboardCourse = {
  id: string;
  matiereId: string;
  matiereDesignation: string | null;
  programmeDesignation: string | null;
  semestreDesignation: string | null;
};

export type TeacherDashboardActivityCard = {
  id: string;
  coursId: string;
  designation: string;
  categoryKey: string;
  categoryLabel: string;
  dateLimite: string | null;
  montant: number;
  totalCommandes: number;
  successCount: number;
  pendingCount: number;
  gradedCount: number;
  revenue: number;
  commandes: TeacherDashboardCommandeDetail[];
};

export type TeacherDashboardRevenueMonth = {
  key: string;
  label: string;
  revenue: number;
};

export type TeacherDashboardSnapshot = {
  activeAnnee: {
    id: string;
    designation: string | null;
    dateDebut: string | null;
    dateFin: string | null;
  } | null;
  courses: TeacherDashboardCourse[];
  activities: TeacherDashboardActivityCard[];
  commandes: FacultyDashboardCommande[];
  latestTransactions: FacultyDashboardCommande[];
  monthlyRevenue: TeacherDashboardRevenueMonth[];
  summary: {
    totalCommandes: number;
    successCount: number;
    pendingCount: number;
    revenue: number;
    coursesCount: number;
    activitiesCount: number;
  };
};

const CATEGORY_LABELS: Record<string, string> = {
  qcm: "QCM",
  tp: "TP",
  ressource: "Ressource",
};

const SUCCESS_STATUSES = new Set([
  "success",
  "valide",
  "validated",
  "corrige",
  "corrigee",
  "done",
  "complete",
  "completed",
  "traite",
  "traitee",
  "resolved",
]);

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeWord = (value: string | null | undefined) =>
  normalizeText(value)
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") ?? null;

const normalizeCategory = (value: string | null) => normalizeWord(value) ?? "autres";

const getCategoryLabel = (value: string | null) => {
  const key = normalizeCategory(value);
  return CATEGORY_LABELS[key] ?? (normalizeText(value) ?? "Autres");
};

const normalizeStatus = (value: string | null, note: number | null): "success" | "pending" => {
  const status = normalizeWord(value);

  if (status && SUCCESS_STATUSES.has(status)) {
    return "success";
  }

  if (typeof note === "number") {
    return "success";
  }

  return "pending";
};

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
  }).format(date);

const toDateTimeStart = (value: string) => `${value}T00:00:00.000Z`;

const toDateTimeExclusiveEnd = (value: string) => {
  const end = new Date(`${value}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
};

const buildRevenueMonths = (
  commandes: FacultyDashboardCommande[],
  start: string | null,
  end: string | null,
): TeacherDashboardRevenueMonth[] => {
  if (!start || !end) {
    return [];
  }

  const cursor = new Date(`${start}T00:00:00.000Z`);
  const finalDate = new Date(`${end}T00:00:00.000Z`);
  const buckets = new Map<string, TeacherDashboardRevenueMonth>();

  while (cursor <= finalDate) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      key,
      label: formatMonthLabel(cursor),
      revenue: 0,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
  }

  for (const commande of commandes) {
    if (commande.status !== "success") {
      continue;
    }

    const createdAt = new Date(commande.created_at);
    const key = `${createdAt.getUTCFullYear()}-${String(createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);

    if (!bucket) {
      continue;
    }

    bucket.revenue += commande.total ?? 0;
  }

  return Array.from(buckets.values());
};

export const getTeacherDashboardSnapshot = async (agentId?: string): Promise<TeacherDashboardSnapshot> => {
  const admin = createAdminClient();
  const assignments = await getTeacherAssignedCourses(agentId);

  const { data: activeAnneeData, error: activeAnneeError } = await admin
    .from("annees")
    .select("id, designation, date_debut, date_fin, created_at, active")
    .eq("active", "true")
    .order("date_debut", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeAnneeError) {
    throw new Error(activeAnneeError.message);
  }

  const activeAnnee = (activeAnneeData ?? null) as ActiveAnneeRecord | null;
  const assignmentsInYear = activeAnnee?.id
    ? assignments.filter((assignment) => assignment.programme?.annee_id === activeAnnee.id)
    : assignments.filter((assignment) => assignment.annee?.active === "true");
  const scopedAssignments = assignmentsInYear.length > 0 ? assignmentsInYear : assignments;

  const coursesById = new Map<string, TeacherDashboardCourse>();

  for (const assignment of scopedAssignments) {
    if (coursesById.has(assignment.cours.id)) {
      continue;
    }

    coursesById.set(assignment.cours.id, {
      id: assignment.cours.id,
      matiereId: assignment.matiere.id,
      matiereDesignation: assignment.matiere.designation,
      programmeDesignation: assignment.programme?.designation ?? null,
      semestreDesignation: assignment.semestre?.designation ?? null,
    });
  }

  const courses = Array.from(coursesById.values()).sort((left, right) =>
    (left.matiereDesignation ?? "").localeCompare(right.matiereDesignation ?? ""),
  );

  const courseIds = courses.map((course) => course.id);

  if (courseIds.length === 0) {
    return {
      activeAnnee: activeAnnee
        ? {
            id: activeAnnee.id,
            designation: activeAnnee.designation,
            dateDebut: activeAnnee.date_debut,
            dateFin: activeAnnee.date_fin,
          }
        : null,
      courses: [],
      activities: [],
      commandes: [],
      latestTransactions: [],
      monthlyRevenue: [],
      summary: {
        totalCommandes: 0,
        successCount: 0,
        pendingCount: 0,
        revenue: 0,
        coursesCount: 0,
        activitiesCount: 0,
      },
    };
  }

  const assignmentByCourseId = new Map(scopedAssignments.map((assignment) => [assignment.cours.id, assignment] as const));

  const { data: rawActivities, error: activitiesError } = await admin
    .from("activity")
    .select("id, created_at, categorie, cours_id, designation, description, montant, slug, entra_id, note, date_limite, is_active")
    .in("cours_id", courseIds)
    .order("created_at", { ascending: true });

  if (activitiesError) {
    throw new Error(activitiesError.message);
  }

  const activities = (rawActivities ?? []) as TeacherActivityRecord[];
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity] as const));
  const activityIds = activities.map((activity) => activity.id);

  const hasActiveRange = Boolean(activeAnnee?.date_debut && activeAnnee?.date_fin);
  const cmdQuery = admin
    .from("cmd_activity")
    .select("id, created_at, activity_id, student_id, status, note, slug, entra_id, comment, student:students(id, nom, post_nom, prenom, email, grade)")
    .in("activity_id", activityIds)
    .order("created_at", { ascending: false });

  if (hasActiveRange) {
    cmdQuery.gte("created_at", toDateTimeStart(activeAnnee!.date_debut!)).lt("created_at", toDateTimeExclusiveEnd(activeAnnee!.date_fin!));
  }

  const { data: rawCommandes, error: commandesError } = activityIds.length ? await cmdQuery : { data: [], error: null };

  if (commandesError) {
    throw new Error(commandesError.message);
  }

  const rawRows = (rawCommandes ?? []) as Array<Record<string, unknown>>;

  const commandes: FacultyDashboardCommande[] = rawRows.flatMap((row) => {
    const activityId = typeof row.activity_id === "string" ? row.activity_id : null;
    if (!activityId) {
      return [];
    }

    const activity = activitiesById.get(activityId);
    if (!activity?.cours_id) {
      return [];
    }

    const assignment = assignmentByCourseId.get(activity.cours_id);
    if (!assignment) {
      return [];
    }

    const note = typeof row.note === "number" ? row.note : null;
    const normalizedStatus = normalizeStatus(typeof row.status === "string" ? row.status : null, note);
    const student = row.student as Pick<StudentRecord, "id" | "nom" | "post_nom" | "prenom" | "email" | "grade"> | null | undefined;

    return [
      {
        id: typeof row.id === "string" ? row.id : `cmd-${activityId}-${Math.random().toString(16).slice(2)}`,
        created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
        product: normalizeText(activity.designation) ?? normalizeText(activity.slug) ?? "Activite",
        categorie: activity.categorie,
        student_id: typeof row.student_id === "string" ? row.student_id : null,
        orderNumber:
          normalizeText(typeof row.slug === "string" ? row.slug : null) ??
          normalizeText(typeof row.entra_id === "string" ? row.entra_id : null),
        total: typeof activity.montant === "number" ? activity.montant : 0,
        status: normalizedStatus,
        description: normalizeText(typeof row.comment === "string" ? row.comment : null) ?? normalizeText(activity.description) ?? null,
        student: student ?? null,
        studentName: student ? getStudentDisplayName(student) : "Etudiant inconnu",
        studentEmail: student?.email ?? null,
        programmeId: assignment.programme?.id ?? null,
        programmeDesignation: assignment.programme?.designation ?? null,
        categoryKey: normalizeCategory(activity.categorie),
        categoryLabel: getCategoryLabel(activity.categorie),
      } satisfies FacultyDashboardCommande,
    ];
  });

  const commandesByActivityId = new Map<string, TeacherDashboardCommandeDetail[]>();

  for (const row of rawRows) {
    const activityId = typeof row.activity_id === "string" ? row.activity_id : null;
    if (!activityId) {
      continue;
    }

    const activity = activitiesById.get(activityId);
    if (!activity) {
      continue;
    }

    const student = row.student as Pick<StudentRecord, "id" | "nom" | "post_nom" | "prenom" | "email" | "grade"> | null | undefined;
    const note = typeof row.note === "number" ? row.note : null;
    const status = normalizeStatus(typeof row.status === "string" ? row.status : null, note);
    const currentRows = commandesByActivityId.get(activityId) ?? [];

    currentRows.push({
      id: typeof row.id === "string" ? row.id : `cmd-${activityId}-${Math.random().toString(16).slice(2)}`,
      createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      studentName: student ? getStudentDisplayName(student) : "Etudiant inconnu",
      studentEmail: student?.email ?? null,
      status,
      note,
      comment: normalizeText(typeof row.comment === "string" ? row.comment : null),
      montant: typeof activity.montant === "number" ? activity.montant : 0,
    });

    commandesByActivityId.set(activityId, currentRows);
  }

  const activityCards = activities
    .map((activity) => {
      const activityRows = (commandesByActivityId.get(activity.id) ?? []).sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );
      const successCount = activityRows.filter((row) => row.status === "success").length;
      const pendingCount = activityRows.length - successCount;
      const gradedCount = activityRows.filter((row) => typeof row.note === "number").length;
      const revenue = activityRows
        .filter((row) => row.status === "success")
        .reduce((sum, row) => sum + row.montant, 0);

      return {
        id: activity.id,
        coursId: activity.cours_id ?? "",
        designation: normalizeText(activity.designation) ?? normalizeText(activity.slug) ?? "Activite",
        categoryKey: normalizeCategory(activity.categorie),
        categoryLabel: getCategoryLabel(activity.categorie),
        dateLimite: activity.date_limite,
        montant: typeof activity.montant === "number" ? activity.montant : 0,
        totalCommandes: activityRows.length,
        successCount,
        pendingCount,
        gradedCount,
        revenue,
        commandes: activityRows,
      } satisfies TeacherDashboardActivityCard;
    })
    .sort((left, right) => {
      if (left.pendingCount !== right.pendingCount) {
        return right.pendingCount - left.pendingCount;
      }
      return left.designation.localeCompare(right.designation);
    });

  const successCount = commandes.filter((commande) => commande.status === "success").length;
  const pendingCount = commandes.length - successCount;
  const revenue = commandes
    .filter((commande) => commande.status === "success")
    .reduce((sum, commande) => sum + (commande.total ?? 0), 0);

  const monthlyRevenue = buildRevenueMonths(
    commandes,
    activeAnnee?.date_debut ?? null,
    activeAnnee?.date_fin ?? null,
  );

  return {
    activeAnnee: activeAnnee
      ? {
          id: activeAnnee.id,
          designation: activeAnnee.designation,
          dateDebut: activeAnnee.date_debut,
          dateFin: activeAnnee.date_fin,
        }
      : null,
    courses,
    activities: activityCards,
    commandes,
    latestTransactions: [...commandes].slice(0, 20),
    monthlyRevenue,
    summary: {
      totalCommandes: commandes.length,
      successCount,
      pendingCount,
      revenue,
      coursesCount: courses.length,
      activitiesCount: activityCards.length,
    },
  };
};
