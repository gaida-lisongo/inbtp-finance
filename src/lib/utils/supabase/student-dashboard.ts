import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getDocumentCategory, type DocumentRecord } from "@/lib/utils/supabase/documents-shared";
import {
  getCommandePath,
  getCurrentAuthenticatedStudent,
  getProductPath,
  type CommandeCategory,
  type CommandeRecord,
} from "@/lib/utils/supabase/commandes";
import type {
  FacultyDashboardCategory,
  FacultyDashboardCommande,
  FacultyDashboardMonth,
  FacultyDashboardProgramme,
} from "@/lib/utils/supabase/faculte-dashboard";
import type { SessionRecord } from "@/lib/utils/supabase/appariteur";
import type { ResearchRecord } from "@/lib/utils/supabase/recherche-shared";
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
type StudentResourceOrderSummary = {
  status: string | null;
  orderNumber: string | null;
  createdAt: string;
};

export type StudentDashboardResource = {
  id: string;
  category: CommandeCategory;
  categoryKey: string;
  categoryLabel: string;
  title: string;
  description: string | null;
  amount: number | null;
  programmeId: string | null;
  programmeDesignation: string | null;
  documentCategory: string | null;
  commandePath: string;
  productPath: string;
  latestOrder: StudentResourceOrderSummary | null;
};

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
  availableResources: StudentDashboardResource[];
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

const isDocumentPublished = (value: string | null) => (value ?? "").trim().toLowerCase() === "true";
const isSessionPublished = (value: string | null) => {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "true" || normalized === "actif";
};
const isResearchPublished = (value: string | null) => (value ?? "").trim().toLowerCase() === "oui";

const mapDocumentCategoryToDashboardKey = (value: string | null) => {
  const normalized = normalizeCategory(value);

  if (normalized === "releve" || normalized === "releves") {
    return "releve";
  }

  if (normalized === "fiche de validation") {
    return "validation";
  }

  return "documents";
};

const mapDocumentCategoryToLabel = (value: string | null) => {
  const dashboardKey = mapDocumentCategoryToDashboardKey(value);

  if (dashboardKey === "releve") {
    return "Relevé";
  }

  if (dashboardKey === "validation") {
    return "Validation";
  }

  return "Documents";
};

const buildResourceOrderMap = (commandes: FacultyDashboardCommande[]) => {
  const latestByResource = new Map<string, StudentResourceOrderSummary>();

  for (const commande of commandes) {
    if (!commande.product) {
      continue;
    }

    const category = mapCommandeCategory(commande.categorie);

    if (!category) {
      continue;
    }

    const key = `${category}:${commande.product}`;
    const existing = latestByResource.get(key);

    if (!existing || new Date(commande.created_at).getTime() > new Date(existing.createdAt).getTime()) {
      latestByResource.set(key, {
        status: commande.status,
        orderNumber: commande.orderNumber,
        createdAt: commande.created_at,
      });
    }
  }

  return latestByResource;
};

const getStudentAvailableResources = async (
  programmeIds: string[],
  programmeDesignationById: Map<string, string | null>,
  orderByResource: Map<string, StudentResourceOrderSummary>,
): Promise<StudentDashboardResource[]> => {
  if (programmeIds.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const uniqueProgrammeIds = Array.from(new Set(programmeIds));

  const [
    { data: documentsData, error: documentsError },
    { data: sessionsData, error: sessionsError },
    { data: stagesData, error: stagesError },
    { data: sujetsData, error: sujetsError },
    { data: laboratoiresData, error: laboratoiresError },
  ] = await Promise.all([
    admin.from("documents").select("id, designation, description, montant, programme_id, caracteristique, is_active").in("programme_id", uniqueProgrammeIds),
    admin.from("session").select("id, designation, description, montant, programme_id, is_active").in("programme_id", uniqueProgrammeIds),
    admin.from("stages").select("id, slug, description, montant, programme_id, is_active").in("programme_id", uniqueProgrammeIds),
    admin.from("sujets").select("id, slug, description, montant, programme_id, is_active").in("programme_id", uniqueProgrammeIds),
    admin.from("laboratoires").select("id, slug, description, montant, programme_id, is_active").in("programme_id", uniqueProgrammeIds),
  ]);

  if (documentsError) {
    throw new Error(documentsError.message);
  }

  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  if (stagesError) {
    throw new Error(stagesError.message);
  }

  if (sujetsError) {
    throw new Error(sujetsError.message);
  }

  if (laboratoiresError) {
    throw new Error(laboratoiresError.message);
  }

  const documents = ((documentsData ?? []) as DocumentRecord[])
    .filter((document) => isDocumentPublished(document.is_active))
    .map((document) => {
      const documentCategory = getDocumentCategory(document);
      const categoryKey = mapDocumentCategoryToDashboardKey(documentCategory);

      return {
        id: document.id,
        category: "documents" as const,
        categoryKey,
        categoryLabel: mapDocumentCategoryToLabel(documentCategory),
        title: normalizeText(document.designation) ?? "Document académique",
        description: normalizeText(document.description),
        amount: typeof document.montant === "number" ? document.montant : null,
        programmeId: document.programme_id ?? null,
        programmeDesignation: document.programme_id ? programmeDesignationById.get(document.programme_id) ?? null : null,
        documentCategory,
        commandePath: getCommandePath("documents", document.id),
        productPath: getProductPath("documents", document.id),
        latestOrder: orderByResource.get(`documents:${document.id}`) ?? null,
      };
    });

  const sessions = ((sessionsData ?? []) as SessionRecord[])
    .filter((session) => isSessionPublished(session.is_active))
    .map((session) => ({
      id: session.id,
      category: "session" as const,
      categoryKey: "session",
      categoryLabel: "Sessions",
      title: normalizeText(session.designation) ?? "Session académique",
      description: formatUnknownText(session.description),
      amount: typeof session.montant === "number" ? session.montant : null,
      programmeId: session.programme_id ?? null,
      programmeDesignation: session.programme_id ? programmeDesignationById.get(session.programme_id) ?? null : null,
      documentCategory: null,
      commandePath: getCommandePath("session", session.id),
      productPath: getProductPath("session", session.id),
      latestOrder: orderByResource.get(`session:${session.id}`) ?? null,
    }));

  const buildResearchResources = (rows: ResearchRecord[], category: Extract<CommandeCategory, "stages" | "sujets" | "laboratoire">, categoryLabel: string) =>
    rows
      .filter((row) => isResearchPublished(row.is_active))
      .map((row) => ({
        id: row.id,
        category,
        categoryKey: category,
        categoryLabel,
        title: normalizeText(row.slug) ?? `${categoryLabel.slice(0, -1)} académique`,
        description: formatUnknownText(row.description),
        amount: typeof row.montant === "number" ? row.montant : null,
        programmeId: row.programme_id ?? null,
        programmeDesignation: row.programme_id ? programmeDesignationById.get(row.programme_id) ?? null : null,
        documentCategory: null,
        commandePath: getCommandePath(category, row.id),
        productPath: getProductPath(category, row.id),
        latestOrder: orderByResource.get(`${category}:${row.id}`) ?? null,
      }));

  return [
    ...documents,
    ...sessions,
    ...buildResearchResources((stagesData ?? []) as ResearchRecord[], "stages", "Stages"),
    ...buildResearchResources((sujetsData ?? []) as ResearchRecord[], "sujets", "Sujets"),
    ...buildResearchResources((laboratoiresData ?? []) as ResearchRecord[], "laboratoire", "Laboratoires"),
  ].sort((left, right) => {
    const leftProgramme = left.programmeDesignation ?? "";
    const rightProgramme = right.programmeDesignation ?? "";

    if (leftProgramme !== rightProgramme) {
      return leftProgramme.localeCompare(rightProgramme);
    }

    return left.title.localeCompare(right.title);
  });
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

  const orderByResource = buildResourceOrderMap(commandes);
  const availableResources = await getStudentAvailableResources(programmeIds, programmeDesignationById, orderByResource);

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
    availableResources,
  };
};
