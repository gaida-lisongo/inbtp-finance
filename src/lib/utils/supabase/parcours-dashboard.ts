import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getStudentDisplayName } from "@/lib/utils/supabase/students-shared";

type ActiveAnneeRecord = {
  id: string;
  designation: string | null;
  date_debut: string | null;
  date_fin: string | null;
  description: string | null;
  created_at: string;
  active: string | null;
};

type ProgrammeRow = {
  id: string;
  designation: string | null;
  filiere_id: string | null;
  annee_id: string | null;
};

type FiliereRow = {
  id: string;
  designation: string | null;
};

type ParcoursRow = {
  id: string;
  created_at: string;
  status: string | null;
  reference: string | null;
  programme_id: string | null;
  student_id: string | null;
};

type StudentRow = {
  id: string;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  email: string | null;
};

export type ParcoursDashboardStudentItem = {
  parcoursId: string;
  createdAt: string;
  status: string | null;
  reference: string | null;
  studentId: string | null;
  studentName: string;
  studentEmail: string | null;
};

export type ParcoursDashboardProgramme = {
  id: string;
  designation: string | null;
  filiereDesignation: string | null;
  anneeDesignation: string | null;
  totalStudents: number;
  okCount: number;
  pendingCount: number;
  noCount: number;
  unknownCount: number;
  students: ParcoursDashboardStudentItem[];
};

export type ParcoursDashboardSnapshot = {
  activeAnnee: ActiveAnneeRecord | null;
  dateWindow: {
    start: string | null;
    end: string | null;
    label: string | null;
    hasRange: boolean;
  };
  summary: {
    totalCount: number;
    okCount: number;
    pendingCount: number;
    noCount: number;
    unknownCount: number;
    programmesCount: number;
  };
  distribution: Array<{
    programmeId: string;
    programmeDesignation: string | null;
    totalStudents: number;
  }>;
  programmes: ParcoursDashboardProgramme[];
};

const formatDateLabel = (date: string | null) => {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(date));
};

const normalizeStatus = (status: string | null) => {
  if (!status) {
    return "unknown" as const;
  }

  const value = status.trim().toLowerCase();

  if (value === "ok" || value === "pending" || value === "no") {
    return value;
  }

  return "unknown" as const;
};

export const getParcoursDashboardSnapshot = async (): Promise<ParcoursDashboardSnapshot> => {
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

  if (!activeAnnee?.id) {
    return {
      activeAnnee: null,
      dateWindow: {
        start: null,
        end: null,
        label: null,
        hasRange: false,
      },
      summary: {
        totalCount: 0,
        okCount: 0,
        pendingCount: 0,
        noCount: 0,
        unknownCount: 0,
        programmesCount: 0,
      },
      distribution: [],
      programmes: [],
    };
  }

  const [{ data: programmesData, error: programmesError }, { data: filieresData, error: filieresError }] = await Promise.all([
    admin.from("programmes").select("id, designation, filiere_id, annee_id").eq("annee_id", activeAnnee.id).order("designation", { ascending: true }),
    admin.from("filieres").select("id, designation"),
  ]);

  if (programmesError) {
    throw new Error(programmesError.message);
  }

  if (filieresError) {
    throw new Error(filieresError.message);
  }

  const programmes = (programmesData ?? []) as ProgrammeRow[];
  const programmeIds = programmes.map((programme) => programme.id);

  if (programmeIds.length === 0) {
    return {
      activeAnnee,
      dateWindow: {
        start: activeAnnee.date_debut,
        end: activeAnnee.date_fin,
        label:
          activeAnnee.date_debut && activeAnnee.date_fin
            ? `${formatDateLabel(activeAnnee.date_debut)} - ${formatDateLabel(activeAnnee.date_fin)}`
            : null,
        hasRange: Boolean(activeAnnee.date_debut && activeAnnee.date_fin),
      },
      summary: {
        totalCount: 0,
        okCount: 0,
        pendingCount: 0,
        noCount: 0,
        unknownCount: 0,
        programmesCount: 0,
      },
      distribution: [],
      programmes: [],
    };
  }

  const { data: parcoursData, error: parcoursError } = await admin
    .from("parcours")
    .select("id, created_at, status, reference, programme_id, student_id")
    .in("programme_id", programmeIds)
    .order("created_at", { ascending: false });

  if (parcoursError) {
    throw new Error(parcoursError.message);
  }

  const parcoursRows = (parcoursData ?? []) as ParcoursRow[];
  const studentIds = Array.from(new Set(parcoursRows.map((row) => row.student_id).filter(Boolean))) as string[];

  const { data: studentsData, error: studentsError } =
    studentIds.length > 0
      ? await admin.from("students").select("id, nom, post_nom, prenom, email").in("id", studentIds)
      : { data: [], error: null };

  if (studentsError) {
    throw new Error(studentsError.message);
  }

  const studentsById = new Map(((studentsData ?? []) as StudentRow[]).map((student) => [student.id, student] as const));
  const filieresById = new Map(((filieresData ?? []) as FiliereRow[]).map((filiere) => [filiere.id, filiere.designation] as const));

  const programmesById = new Map<string, ParcoursDashboardProgramme>(
    programmes.map((programme) => [
      programme.id,
      {
        id: programme.id,
        designation: programme.designation,
        filiereDesignation: programme.filiere_id ? filieresById.get(programme.filiere_id) ?? null : null,
        anneeDesignation: activeAnnee.designation,
        totalStudents: 0,
        okCount: 0,
        pendingCount: 0,
        noCount: 0,
        unknownCount: 0,
        students: [],
      },
    ]),
  );

  let okCount = 0;
  let pendingCount = 0;
  let noCount = 0;
  let unknownCount = 0;

  for (const row of parcoursRows) {
    if (!row.programme_id) {
      continue;
    }

    const programme = programmesById.get(row.programme_id);

    if (!programme) {
      continue;
    }

    const student = row.student_id ? studentsById.get(row.student_id) ?? null : null;
    const status = normalizeStatus(row.status);

    programme.totalStudents += 1;

    if (status === "ok") {
      programme.okCount += 1;
      okCount += 1;
    } else if (status === "pending") {
      programme.pendingCount += 1;
      pendingCount += 1;
    } else if (status === "no") {
      programme.noCount += 1;
      noCount += 1;
    } else {
      programme.unknownCount += 1;
      unknownCount += 1;
    }

    programme.students.push({
      parcoursId: row.id,
      createdAt: row.created_at,
      status: row.status,
      reference: row.reference,
      studentId: row.student_id,
      studentName: student ? getStudentDisplayName(student) : "Etudiant introuvable",
      studentEmail: student?.email ?? null,
    });
  }

  const programmeList = Array.from(programmesById.values()).sort((left, right) =>
    (left.designation ?? "").localeCompare(right.designation ?? ""),
  );

  return {
    activeAnnee,
    dateWindow: {
      start: activeAnnee.date_debut,
      end: activeAnnee.date_fin,
      label:
        activeAnnee.date_debut && activeAnnee.date_fin
          ? `${formatDateLabel(activeAnnee.date_debut)} - ${formatDateLabel(activeAnnee.date_fin)}`
          : null,
      hasRange: Boolean(activeAnnee.date_debut && activeAnnee.date_fin),
    },
    summary: {
      totalCount: parcoursRows.length,
      okCount,
      pendingCount,
      noCount,
      unknownCount,
      programmesCount: programmeList.length,
    },
    distribution: programmeList.map((programme) => ({
      programmeId: programme.id,
      programmeDesignation: programme.designation,
      totalStudents: programme.totalStudents,
    })),
    programmes: programmeList,
  };
};
