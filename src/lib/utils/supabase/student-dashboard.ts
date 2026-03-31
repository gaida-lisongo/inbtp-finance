import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getCurrentAuthenticatedStudent, type CommandeCategory, type CommandeRecord } from "@/lib/utils/supabase/commandes";
import type {
  FacultyDashboardCategory,
  FacultyDashboardCommande,
  FacultyDashboardMonth,
  FacultyDashboardProgramme,
} from "@/lib/utils/supabase/faculte-dashboard";
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

type ParcoursRecord = {
  id: string;
  created_at: string;
  student_id: string | null;
  status: string | null;
  reference: string | null;
  programme_id: string | null;
};

type ResourceProgrammeMap = Map<string, string | null>;

export type StudentDashboardSnapshot = {
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
    parcoursCount: number;
    activeParcoursCount: number;
  };
  dateWindow: {
    start: string | null;
    end: string | null;
    label: string | null;
    hasRange: boolean;
  };
  student: Pick<StudentRecord, "id" | "nom" | "post_nom" | "prenom" | "email" | "grade" | "telephone"> & {
    displayName: string;
  };
  parcours: Array<
    ParcoursRecord & {
      programmeDesignation: string | null;
      filiereDesignation: string | null;
      anneeDesignation: string | null;
      isInActiveYear: boolean;
    }
  >;
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

const mapCommandeCategory = (value: string | null): CommandeCategory | null => {
  const normalized = normalizeCategory(value);

  switch (normalized) {
    case "documents":
    case "document":
    case "releve":
    case "releves":
    case "validation":
    case "validations":
      return "documents";
    case "session":
    case "sessions":
      return "session";
    case "stage":
    case "stages":
      return "stages";
    case "sujet":
    case "sujets":
      return "sujets";
    case "laboratoire":
    case "laboratoires":
      return "laboratoire";
    default:
      return null;
  }
};

const formatDateLabel = (date: string | null) => {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(date));
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

const buildSummary = (commandes: FacultyDashboardCommande[], parcoursCount: number, activeParcoursCount: number) => {
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
    parcoursCount,
    activeParcoursCount,
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

const getTableNameForCategory = (category: CommandeCategory) => {
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
  }
};

const getProgrammeIdsByResource = async (commandes: CommandeRecord[]) => {
  const admin = createAdminClient();
  const idsByCategory = new Map<CommandeCategory, string[]>();

  for (const commande of commandes) {
    const category = mapCommandeCategory(commande.categorie);
    const productId = typeof commande.product === "string" && commande.product.length > 0 ? commande.product : null;

    if (!category || !productId) {
      continue;
    }

    const existing = idsByCategory.get(category) ?? [];
    existing.push(productId);
    idsByCategory.set(category, existing);
  }

  const programmeByResourceKey: ResourceProgrammeMap = new Map();

  await Promise.all(
    Array.from(idsByCategory.entries()).map(async ([category, ids]) => {
      const uniqueIds = Array.from(new Set(ids));

      if (uniqueIds.length === 0) {
        return;
      }

      const tableName = getTableNameForCategory(category);
      const { data, error } = await admin.from(tableName).select("id, programme_id").in("id", uniqueIds);

      if (error) {
        throw new Error(error.message);
      }

      for (const row of (data ?? []) as Array<{ id: string; programme_id: string | null }>) {
        programmeByResourceKey.set(`${category}:${row.id}`, row.programme_id ?? null);
      }
    }),
  );

  return programmeByResourceKey;
};

export const getStudentDashboardSnapshot = async (): Promise<StudentDashboardSnapshot> => {
  const admin = createAdminClient();
  const student = await getCurrentAuthenticatedStudent();

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
  const hasRange = Boolean(activeAnnee?.date_debut && activeAnnee?.date_fin);
  const rangeLabel =
    activeAnnee?.date_debut && activeAnnee?.date_fin
      ? `${formatDateLabel(activeAnnee.date_debut)} - ${formatDateLabel(activeAnnee.date_fin)}`
      : null;

  const [{ data: parcoursData, error: parcoursError }, { data: commandesData, error: commandesError }, { data: filieresData, error: filieresError }] =
    await Promise.all([
      admin.from("parcours").select("id, created_at, student_id, status, reference, programme_id").eq("student_id", student.id).order("created_at", { ascending: false }),
      hasRange
        ? admin
            .from("commande")
            .select('id, created_at, product, categorie, student_id, "orderNumber", total, status, description')
            .eq("student_id", student.id)
            .gte("created_at", toDateTimeStart(activeAnnee!.date_debut!))
            .lt("created_at", toDateTimeExclusiveEnd(activeAnnee!.date_fin!))
            .order("created_at", { ascending: false })
        : admin.from("commande").select('id, created_at, product, categorie, student_id, "orderNumber", total, status, description').eq("student_id", student.id).order("created_at", { ascending: false }),
      admin.from("filieres").select("id, designation"),
    ]);

  if (parcoursError) {
    throw new Error(parcoursError.message);
  }

  if (commandesError) {
    throw new Error(commandesError.message);
  }

  if (filieresError) {
    throw new Error(filieresError.message);
  }

  const parcoursRows = (parcoursData ?? []) as ParcoursRecord[];
  const programmeIds = Array.from(new Set(parcoursRows.map((parcours) => parcours.programme_id).filter(Boolean))) as string[];

  const { data: programmesData, error: programmesError } =
    programmeIds.length > 0
      ? await admin
          .from("programmes")
          .select("id, created_at, filiere_id, designation, description, annee_id, slug, groupe_id, systeme")
          .in("id", programmeIds)
          .order("designation", { ascending: true })
      : { data: [], error: null };

  if (programmesError) {
    throw new Error(programmesError.message);
  }

  const filieresById = new Map(
    ((filieresData ?? []) as Array<{ id: string; designation: string | null }>).map((filiere) => [filiere.id, filiere.designation] as const),
  );

  const allProgrammes = ((programmesData ?? []) as ProgrammeRecord[]).map((programme) => ({
    ...programme,
    filiereDesignation: programme.filiere_id ? filieresById.get(programme.filiere_id) ?? null : null,
    anneeDesignation: programme.annee_id === activeAnnee?.id ? activeAnnee?.designation ?? null : null,
  }));

  const sortedProgrammes = [...allProgrammes].sort((left, right) => {
    const leftActive = left.annee_id === activeAnnee?.id ? 1 : 0;
    const rightActive = right.annee_id === activeAnnee?.id ? 1 : 0;

    if (leftActive !== rightActive) {
      return rightActive - leftActive;
    }

    return (left.designation ?? "").localeCompare(right.designation ?? "");
  });

  const programmes: FacultyDashboardProgramme[] = sortedProgrammes;
  const programmeDesignationById = new Map(programmes.map((programme) => [programme.id, programme.designation] as const));
  const programmeById = new Map(programmes.map((programme) => [programme.id, programme] as const));

  const parcours = parcoursRows.map((parcours) => {
    const programme = parcours.programme_id ? programmeById.get(parcours.programme_id) ?? null : null;

    return {
      ...parcours,
      programmeDesignation: programme?.designation ?? null,
      filiereDesignation: programme?.filiereDesignation ?? null,
      anneeDesignation: programme?.anneeDesignation ?? null,
      isInActiveYear: Boolean(activeAnnee?.id && programme?.annee_id === activeAnnee.id),
    };
  });

  const programmeByResource = await getProgrammeIdsByResource((commandesData ?? []) as CommandeRecord[]);

  const commandes: FacultyDashboardCommande[] = ((commandesData ?? []) as CommandeRecord[]).map((commande) => {
    const categoryKey = normalizeCategory(commande.categorie);
    const mappedCategory = mapCommandeCategory(commande.categorie);
    const resourceProgrammeId =
      mappedCategory && typeof commande.product === "string" && commande.product.length > 0
        ? programmeByResource.get(`${mappedCategory}:${commande.product}`) ?? null
        : null;

    return {
      ...commande,
      student: student,
      studentName: getStudentDisplayName(student),
      studentEmail: student.email ?? null,
      programmeId: resourceProgrammeId,
      programmeDesignation: resourceProgrammeId ? programmeDesignationById.get(resourceProgrammeId) ?? null : null,
      categoryKey,
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
    summary: buildSummary(commandes, parcours.length, parcours.filter((item) => item.isInActiveYear).length),
    dateWindow: {
      start: activeAnnee?.date_debut ?? null,
      end: activeAnnee?.date_fin ?? null,
      label: rangeLabel,
      hasRange,
    },
    student: {
      ...student,
      displayName: getStudentDisplayName(student),
    },
    parcours,
  };
};
