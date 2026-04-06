import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getStudentDisplayName, type StudentRecord } from "@/lib/utils/supabase/students-shared";

type ActiveAnneeRecord = {
  id: string;
  designation: string | null;
  date_debut: string | null;
  date_fin: string | null;
  description: string | null;
  created_at: string;
  active: string | null;
};

type ProgrammeRecord = {
  id: string;
  created_at: string;
  filiere_id: string | null;
  designation: string | null;
  description: string | null;
  annee_id: string | null;
  slug: string | null;
  groupe_id: string | null;
  systeme: string | null;
};

type CommandeRecord = {
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

export type FacultyDashboardCommande = CommandeRecord & {
  student: Pick<StudentRecord, "id" | "nom" | "post_nom" | "prenom" | "email" | "grade"> | null;
  studentName: string;
  studentEmail: string | null;
  programmeId: string | null;
  programmeDesignation: string | null;
  categoryKey: string;
  categoryLabel: string;
};

export type FacultyDashboardProgramme = ProgrammeRecord & {
  filiereDesignation: string | null;
  anneeDesignation: string | null;
};

export type FacultyDashboardMonth = {
  key: string;
  label: string;
  success: number;
  pending: number;
};

export type FacultyDashboardCategory = {
  key: string;
  label: string;
  total: number;
  success: number;
  pending: number;
  revenue: number;
};

export type FacultyDashboardSnapshot = {
  activeAnnee: ActiveAnneeRecord | null;
  programmes: FacultyDashboardProgramme[];
  commandes: FacultyDashboardCommande[];
  latestTransactions: FacultyDashboardCommande[];
  monthlySeries: FacultyDashboardMonth[];
  categories: FacultyDashboardCategory[];
  summary: {
    totalCommandes: number;
    successCount: number;
    pendingCount: number;
    successRevenue: number;
    pendingRevenue: number;
    successRate: number;
  };
  dateWindow: {
    start: string | null;
    end: string | null;
    label: string | null;
    hasRange: boolean;
  };
};

const CATEGORY_LABELS: Record<string, string> = {
  sujet: "Sujets",
  sujets: "Sujets",
  stage: "Stages",
  stages: "Stages",
  session: "Sessions",
  sessions: "Sessions",
  laboratoire: "Laboratoires",
  laboratoires: "Laboratoires",
  document: "Documents",
  documents: "Documents",
  releve: "Relevé",
  releves: "Relevé",
  validation: "Validation",
  validations: "Validation",
};

const normalizeCategory = (value: string | null) => {
  if (!value) {
    return "autres";
  }

  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const getCategoryLabel = (value: string | null) => {
  const normalized = normalizeCategory(value);
  return CATEGORY_LABELS[normalized] ?? (value?.trim().length ? value.trim() : "Autres");
};

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
  }).format(date);

const formatDateLabel = (date: string | null) => {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(date));
};

const toDateTimeStart = (value: string) => `${value}T00:00:00.000Z`;

const toDateTimeExclusiveEnd = (value: string) => {
  const end = new Date(`${value}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
};

const buildMonthSeries = (commandes: FacultyDashboardCommande[], start: string | null, end: string | null): FacultyDashboardMonth[] => {
  if (!start || !end) {
    return [];
  }

  const cursor = new Date(`${start}T00:00:00.000Z`);
  const finalDate = new Date(`${end}T00:00:00.000Z`);
  const buckets = new Map<string, FacultyDashboardMonth>();

  while (cursor <= finalDate) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      key,
      label: formatMonthLabel(cursor),
      success: 0,
      pending: 0,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
  }

  for (const commande of commandes) {
    if (commande.status !== "success" && commande.status !== "pending") {
      continue;
    }

    const createdAt = new Date(commande.created_at);
    const key = `${createdAt.getUTCFullYear()}-${String(createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);

    if (!bucket) {
      continue;
    }

    if (commande.status === "success") {
      bucket.success += 1;
    } else {
      bucket.pending += 1;
    }
  }

  return Array.from(buckets.values());
};

const buildSummary = (commandes: FacultyDashboardCommande[]) => {
  const successCommandes = commandes.filter((commande) => commande.status === "success");
  const pendingCommandes = commandes.filter((commande) => commande.status === "pending");
  const successRevenue = successCommandes.reduce((sum, commande) => sum + (commande.total ?? 0), 0);
  const pendingRevenue = pendingCommandes.reduce((sum, commande) => sum + (commande.total ?? 0), 0);
  const trackedCount = successCommandes.length + pendingCommandes.length;

  return {
    totalCommandes: commandes.length,
    successCount: successCommandes.length,
    pendingCount: pendingCommandes.length,
    successRevenue,
    pendingRevenue,
    successRate: trackedCount > 0 ? Math.round((successCommandes.length / trackedCount) * 100) : 0,
  };
};

const buildCategories = (commandes: FacultyDashboardCommande[]): FacultyDashboardCategory[] => {
  const categories = new Map<string, FacultyDashboardCategory>();

  for (const commande of commandes) {
    const existing = categories.get(commande.categoryKey) ?? {
      key: commande.categoryKey,
      label: commande.categoryLabel,
      total: 0,
      success: 0,
      pending: 0,
      revenue: 0,
    };

    existing.total += 1;
    existing.revenue += commande.total ?? 0;

    if (commande.status === "success") {
      existing.success += 1;
    }

    if (commande.status === "pending") {
      existing.pending += 1;
    }

    categories.set(commande.categoryKey, existing);
  }

  return Array.from(categories.values()).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
};

export const getFacultyDashboardSnapshot = async (): Promise<FacultyDashboardSnapshot> => {
  const admin = createAdminClient();

  const { data: activeAnneeData, error: activeAnneeError } = await admin
    .from("annees")
    .select("id, designation, date_debut, date_fin, description, created_at, active")
    .eq("active", "true")
    .order("date_debut", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeAnneeError) {
    throw new Error(activeAnneeError.message);
  }

  const activeAnnee = (activeAnneeData ?? null) as ActiveAnneeRecord | null;

  const [{ data: programmesData, error: programmesError }, { data: filieresData, error: filieresError }] = await Promise.all([
    activeAnnee
      ? admin
          .from("programmes")
          .select("id, created_at, filiere_id, designation, description, annee_id, slug, groupe_id, systeme")
          .eq("annee_id", activeAnnee.id)
          .order("designation", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    admin.from("filieres").select("id, designation"),
  ]);

  if (programmesError) {
    throw new Error(programmesError.message);
  }

  if (filieresError) {
    throw new Error(filieresError.message);
  }

  const filieresById = new Map(
    ((filieresData ?? []) as Array<{ id: string; designation: string | null }>).map((filiere) => [filiere.id, filiere.designation] as const),
  );

  const programmes = ((programmesData ?? []) as ProgrammeRecord[]).map((programme) => ({
    ...programme,
    filiereDesignation: programme.filiere_id ? filieresById.get(programme.filiere_id) ?? null : null,
    anneeDesignation: activeAnnee?.designation ?? null,
  }));

  const hasRange = Boolean(activeAnnee?.date_debut && activeAnnee?.date_fin);
  const rangeLabel =
    activeAnnee?.date_debut && activeAnnee?.date_fin
      ? `${formatDateLabel(activeAnnee.date_debut)} - ${formatDateLabel(activeAnnee.date_fin)}`
      : null;

  const { data: rangedCommandesData, error: commandesError } = hasRange
    ? await admin
        .from("commande")
        .select('id, created_at, product, categorie, student_id, "orderNumber", total, status, description')
        .gte("created_at", toDateTimeStart(activeAnnee!.date_debut!))
        .lt("created_at", toDateTimeExclusiveEnd(activeAnnee!.date_fin!))
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (commandesError) {
    throw new Error(commandesError.message);
  }

  let commandesData = (rangedCommandesData ?? []) as CommandeRecord[];

  // Fallback: si la periode active est mal renseignee ou ne couvre pas les transactions,
  // on charge un historique recent pour ne pas afficher un dashboard vide.
  if (commandesData.length === 0) {
    const { data: fallbackCommandesData, error: fallbackCommandesError } = await admin
      .from("commande")
      .select('id, created_at, product, categorie, student_id, "orderNumber", total, status, description')
      .order("created_at", { ascending: false })
      .limit(500);

    if (fallbackCommandesError) {
      throw new Error(fallbackCommandesError.message);
    }

    commandesData = (fallbackCommandesData ?? []) as CommandeRecord[];
  }

  const studentIds = Array.from(new Set(commandesData.map((commande) => commande.student_id).filter(Boolean))) as string[];

  let studentsById = new Map<string, Pick<StudentRecord, "id" | "nom" | "post_nom" | "prenom" | "email" | "grade">>();
  let programmeByStudentId = new Map<string, { programmeId: string | null; programmeDesignation: string | null }>();

  if (studentIds.length > 0) {
    const [{ data: studentsData, error: studentsError }, { data: parcoursData, error: parcoursError }] = await Promise.all([
      admin.from("students").select("id, nom, post_nom, prenom, email, grade").in("id", studentIds),
      admin
        .from("parcours")
        .select("student_id, programme_id")
        .in("student_id", studentIds),
    ]);

    if (studentsError) {
      throw new Error(studentsError.message);
    }

    if (parcoursError) {
      throw new Error(parcoursError.message);
    }

    studentsById = new Map(
      ((studentsData ?? []) as Array<Pick<StudentRecord, "id" | "nom" | "post_nom" | "prenom" | "email" | "grade">>).map((student) => [
        student.id,
        student,
      ] as const),
    );

    const programmeDesignationById = new Map(programmes.map((programme) => [programme.id, programme.designation] as const));
    programmeByStudentId = new Map(
      ((parcoursData ?? []) as Array<{ student_id: string | null; programme_id: string | null }>)
        .filter((parcours) => typeof parcours.student_id === "string" && parcours.student_id.length > 0)
        .map((parcours) => [
          parcours.student_id as string,
          {
            programmeId: parcours.programme_id ?? null,
            programmeDesignation: parcours.programme_id ? programmeDesignationById.get(parcours.programme_id) ?? null : null,
          },
        ] as const),
    );
  }

  const commandes = commandesData.map((commande) => {
    const student = commande.student_id ? studentsById.get(commande.student_id) ?? null : null;
    const programme = commande.student_id ? programmeByStudentId.get(commande.student_id) : null;

    return {
      ...commande,
      student,
      studentName: student ? getStudentDisplayName(student) : "Etudiant introuvable",
      studentEmail: student?.email ?? null,
      programmeId: programme?.programmeId ?? null,
      programmeDesignation: programme?.programmeDesignation ?? null,
      categoryKey: normalizeCategory(commande.categorie),
      categoryLabel: getCategoryLabel(commande.categorie),
    };
  });

  return {
    activeAnnee,
    programmes,
    commandes,
    latestTransactions: commandes.slice(0, 20),
    monthlySeries: buildMonthSeries(commandes, activeAnnee?.date_debut ?? null, activeAnnee?.date_fin ?? null),
    categories: buildCategories(commandes),
    summary: buildSummary(commandes),
    dateWindow: {
      start: activeAnnee?.date_debut ?? null,
      end: activeAnnee?.date_fin ?? null,
      label: rangeLabel,
      hasRange,
    },
  };
};
