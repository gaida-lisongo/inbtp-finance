import { createAdminClient } from "@/lib/utils/supabase/admin";
import type { CoursRecord, MatiereRecord, SemestreRecord, UniteRecord } from "@/lib/utils/supabase/enseignement";
import type { ActivityCategory, ActivityRecord, CourseDetailRecord } from "@/lib/utils/supabase/student-course";

type ProgrammeRecord = {
  id: string;
  designation: string | null;
  annee_id: string | null;
  slug: string | null;
};

type AnneeRecord = {
  id: string;
  designation: string | null;
  active: string | null;
  date_debut: string | null;
  created_at: string;
};

export type TeacherAssignedCourse = {
  cours: CoursRecord;
  matiere: MatiereRecord;
  unite: UniteRecord | null;
  semestre: SemestreRecord | null;
  programme: ProgrammeRecord | null;
  annee: AnneeRecord | null;
};

export type TeacherCourseQuestion = {
  enonce: string;
  items?: string[];
  reponseIndex?: number;
  pts?: number;
  url?: string;
};

export type TeacherActivityNote = {
  id: string;
  activity_id: string | null;
  status: string | null;
  note: number | null;
  comment: string | null;
  created_at: string;
  student: {
    id: string;
    nom: string | null;
    post_nom: string | null;
    prenom: string | null;
    email: string | null;
  } | null;
};

export type TeacherCourseActivity = ActivityRecord & {
  category: Extract<ActivityCategory, "qcm" | "tp">;
  questions: TeacherCourseQuestion[];
  notes: TeacherActivityNote[];
};

export type TeacherCourseCotation = {
  id: string;
  cc: number | null;
  examen: number | null;
  rattrapage: number | null;
  rachat: number | null;
  is_validate: string | null;
};

export type TeacherCourseCotationStudent = {
  parcoursId: string;
  reference: string | null;
  status: string | null;
  student: {
    id: string;
    nom: string | null;
    post_nom: string | null;
    prenom: string | null;
    email: string | null;
  };
  cotation: TeacherCourseCotation | null;
};

export type TeacherProgrammeMenuYear = {
  id: string;
  designation: string | null;
  active: string | null;
  programmes: Array<{
    id: string;
    designation: string | null;
  }>;
};

export type TeacherProgrammePageData = {
  programme: ProgrammeRecord;
  annee: AnneeRecord | null;
  assignments: TeacherAssignedCourse[];
};

export type TeacherCoursePageDetails = TeacherAssignedCourse & {
  courseDetails: CourseDetailRecord | null;
  activities: TeacherCourseActivity[];
  cotationStudents: TeacherCourseCotationStudent[];
};

export type TeacherActivityCommandeEditorRow = {
  id: string;
  created_at: string;
  status: string | null;
  note: number | null;
  comment: string | null;
  student: {
    id: string;
    nom: string | null;
    post_nom: string | null;
    prenom: string | null;
    email: string | null;
  } | null;
};

export type TeacherActivityCommandesPageData = {
  activity: ActivityRecord & {
    category: Extract<ActivityCategory, "qcm" | "tp">;
  };
  assignment: TeacherAssignedCourse;
  commandes: TeacherActivityCommandeEditorRow[];
};

export type TeacherCourseCotationDraftRow = {
  studentId: string;
  cc?: number | null;
  examen?: number | null;
  rattrapage?: number | null;
  rachat?: number | null;
};

const parseStructuredInput = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.startsWith("{") || trimmedValue.startsWith("[")) {
    try {
      return JSON.parse(trimmedValue);
    } catch {
      throw new Error("invalid_structured_json");
    }
  }

  return trimmedValue;
};

const getCurrentAuthenticatedTeacherAgentId = async () => {
  const user = await getAuthenticatedUser();

  if (!user || user.activePersona !== "teacher" || !user.agentId) {
    throw new Error("teacher_access_denied");
  }

  return user.agentId;
};

const buildStudentFullName = (student: {
  nom?: string | null;
  post_nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  id?: string | null;
}) =>
  [student.prenom, student.post_nom, student.nom].filter(Boolean).join(" ").trim() ||
  student.email ||
  student.id ||
  "Étudiant";

const roundNote = (value: number) => Math.round(value * 100) / 100;

const parseNullableNoteValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? roundNote(parsed) : null;
};

const normalizeTeacherActivityCategory = (
  value: string | null | undefined,
): Extract<ActivityCategory, "qcm" | "tp"> | null => {
  const normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : null;
  return normalizedValue === "qcm" || normalizedValue === "tp" ? normalizedValue : null;
};

const validateNoteRange = (
  value: number | null,
  max: number,
  field: "cc" | "examen" | "rattrapage" | "rachat",
) => {
  if (value === null) {
    return;
  }

  if (value < 0 || value > max) {
    throw new Error(`${field}_out_of_range`);
  }
};

const computeTeacherCotationValidation = (input: {
  cc: number | null;
  examen: number | null;
  rattrapage: number | null;
  rachat: number | null;
}) => {
  const session = roundNote((input.cc ?? 0) + (input.examen ?? 0));
  const final = input.rachat !== null ? input.rachat : Math.max(session, input.rattrapage ?? 0);

  return {
    final: roundNote(final),
    is_validate: final >= 10 ? "V" : "NV",
  };
};

const detectCsvDelimiter = (row: string): ";" | "," => {
  let inQuotes = false;
  let semicolonCount = 0;
  let commaCount = 0;

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    const nextChar = row[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes) {
      if (char === ";") {
        semicolonCount += 1;
      } else if (char === ",") {
        commaCount += 1;
      }
    }
  }

  return semicolonCount >= commaCount ? ";" : ",";
};

const splitCsvRow = (row: string, delimiter: ";" | ",") => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    const nextChar = row[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
};

const toCsvCell = (value: string | number | null | undefined) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

export const getTeacherAssignedCourses = async (agentId?: string): Promise<TeacherAssignedCourse[]> => {
  const teacherAgentId = agentId ?? (await getCurrentAuthenticatedTeacherAgentId());
  const admin = createAdminClient();
  const { data: coursData, error: coursError } = await admin
    .from("cours")
    .select("id, created_at, matiere_id, titulaire_id, slug, entra_id")
    .eq("titulaire_id", teacherAgentId)
    .order("created_at", { ascending: true });

  if (coursError) {
    throw new Error(coursError.message);
  }

  const coursList = (coursData ?? []) as CoursRecord[];
  const matiereIds = coursList.map((cours) => cours.matiere_id).filter((value): value is string => Boolean(value));

  if (matiereIds.length === 0) {
    return [];
  }

  const { data: matieresData, error: matieresError } = await admin
    .from("matieres")
    .select("id, created_at, designation, unite_id, credits")
    .in("id", matiereIds);

  if (matieresError) {
    throw new Error(matieresError.message);
  }

  const matieres = (matieresData ?? []) as MatiereRecord[];
  const matieresById = new Map(matieres.map((matiere) => [matiere.id, matiere] as const));
  const uniteIds = matieres.map((matiere) => matiere.unite_id).filter((value): value is string => Boolean(value));

  const { data: unitesData, error: unitesError } = uniteIds.length
    ? await admin.from("unites").select("id, created_at, semestre_id, designation, code, credits").in("id", uniteIds)
    : { data: [], error: null };

  if (unitesError) {
    throw new Error(unitesError.message);
  }

  const unites = (unitesData ?? []) as UniteRecord[];
  const unitesById = new Map(unites.map((unite) => [unite.id, unite] as const));
  const semestreIds = unites.map((unite) => unite.semestre_id).filter((value): value is string => Boolean(value));

  const { data: semestresData, error: semestresError } = semestreIds.length
    ? await admin.from("semestres").select("id, created_at, designation, credits, programme_id").in("id", semestreIds)
    : { data: [], error: null };

  if (semestresError) {
    throw new Error(semestresError.message);
  }

  const semestres = (semestresData ?? []) as SemestreRecord[];
  const semestresById = new Map(semestres.map((semestre) => [semestre.id, semestre] as const));
  const programmeIds = semestres.map((semestre) => semestre.programme_id).filter((value): value is string => Boolean(value));

  const { data: programmesData, error: programmesError } = programmeIds.length
    ? await admin.from("programmes").select("id, designation, annee_id, slug").in("id", programmeIds)
    : { data: [], error: null };

  if (programmesError) {
    throw new Error(programmesError.message);
  }

  const programmes = (programmesData ?? []) as ProgrammeRecord[];
  const programmesById = new Map(programmes.map((programme) => [programme.id, programme] as const));
  const anneeIds = programmes.map((programme) => programme.annee_id).filter((value): value is string => Boolean(value));

  const { data: anneesData, error: anneesError } = anneeIds.length
    ? await admin
        .from("annees")
        .select("id, designation, active, date_debut, created_at")
        .in("id", anneeIds)
        .order("date_debut", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (anneesError) {
    throw new Error(anneesError.message);
  }

  const annees = (anneesData ?? []) as AnneeRecord[];
  const anneesById = new Map(annees.map((annee) => [annee.id, annee] as const));

  return coursList.flatMap((cours) => {
    if (!cours.matiere_id) {
      return [];
    }

    const matiere = matieresById.get(cours.matiere_id);

    if (!matiere) {
      return [];
    }

    const unite = matiere.unite_id ? unitesById.get(matiere.unite_id) ?? null : null;
    const semestre = unite?.semestre_id ? semestresById.get(unite.semestre_id) ?? null : null;
    const programme = semestre?.programme_id ? programmesById.get(semestre.programme_id) ?? null : null;
    const annee = programme?.annee_id ? anneesById.get(programme.annee_id) ?? null : null;

    return [
      {
        cours,
        matiere,
        unite,
        semestre,
        programme,
        annee,
      },
    ];
  });
};

export const getTeacherProgrammeMenuData = async (): Promise<TeacherProgrammeMenuYear[]> => {
  const assignments = await getTeacherAssignedCourses();
  const years = new Map<string, TeacherProgrammeMenuYear>();

  for (const assignment of assignments) {
    if (!assignment.annee?.id || !assignment.programme?.id) {
      continue;
    }

    const existingYear = years.get(assignment.annee.id) ?? {
      id: assignment.annee.id,
      designation: assignment.annee.designation,
      active: assignment.annee.active,
      programmes: [],
    };

    if (!existingYear.programmes.some((programme) => programme.id === assignment.programme?.id)) {
      existingYear.programmes.push({
        id: assignment.programme.id,
        designation: assignment.programme.designation,
      });
    }

    years.set(assignment.annee.id, existingYear);
  }

  return Array.from(years.values())
    .sort((left, right) => {
      const leftActive = left.active === "true" ? 1 : 0;
      const rightActive = right.active === "true" ? 1 : 0;

      if (leftActive !== rightActive) {
        return rightActive - leftActive;
      }

      return (right.designation ?? "").localeCompare(left.designation ?? "");
    })
    .map((year) => ({
      ...year,
      programmes: [...year.programmes].sort((left, right) => (left.designation ?? "").localeCompare(right.designation ?? "")),
    }));
};

export const getTeacherProgrammePageData = async (programmeId: string): Promise<TeacherProgrammePageData> => {
  const assignments = (await getTeacherAssignedCourses()).filter((assignment) => assignment.programme?.id === programmeId);

  if (assignments.length === 0) {
    throw new Error("programme_access_denied");
  }

  const programme = assignments[0].programme;

  if (!programme) {
    throw new Error("programme_not_found");
  }

  return {
    programme,
    annee: assignments[0].annee,
    assignments: assignments.sort((left, right) => {
      const leftSemestre = left.semestre?.designation ?? "";
      const rightSemestre = right.semestre?.designation ?? "";

      if (leftSemestre !== rightSemestre) {
        return leftSemestre.localeCompare(rightSemestre);
      }

      const leftUnite = left.unite?.designation ?? "";
      const rightUnite = right.unite?.designation ?? "";

      if (leftUnite !== rightUnite) {
        return leftUnite.localeCompare(rightUnite);
      }

      return (left.matiere.designation ?? "").localeCompare(right.matiere.designation ?? "");
    }),
  };
};

export const getTeacherCoursePageData = async (matiereId: string) => {
  const assignment = (await getTeacherAssignedCourses()).find((item) => item.matiere.id === matiereId);

  if (!assignment) {
    throw new Error("programme_access_denied");
  }

  const admin = createAdminClient();
  const [{ data: courseData, error: courseError }, { data: activityData, error: activityError }] = await Promise.all([
    admin
      .from("cours")
      .select("id, created_at, matiere_id, titulaire_id, description, plan, objectifs, methodologies, penalites, competences, disponiblites, slug, entra_id")
      .eq("id", assignment.cours.id)
      .maybeSingle(),
    admin.from("activity").select("*").eq("cours_id", assignment.cours.id).order("created_at", { ascending: true }),
  ]);

  if (courseError) {
    throw new Error(courseError.message);
  }

  if (activityError) {
    throw new Error(activityError.message);
  }

  const activityRecords = (activityData ?? []) as (ActivityRecord & { questions?: unknown })[];
  const activityIds = activityRecords.map((activity) => activity.id).filter((value): value is string => Boolean(value));

  const { data: activityNotesData, error: activityNotesError } = activityIds.length
    ? await admin
    .from("cmd_activity")
    .select("id, created_at, activity_id, status, note, comment, student:students(id, nom, post_nom, prenom, email)")
        .in("activity_id", activityIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (activityNotesError) {
    throw new Error(activityNotesError.message);
  }

  const notesByActivityId = new Map<string, TeacherActivityNote[]>();

  for (const rawNote of (activityNotesData ?? []) as Array<Record<string, unknown>>) {
    const activityId = typeof rawNote.activity_id === "string" ? rawNote.activity_id : null;

    if (!activityId) {
      continue;
    }

    const studentRecord = rawNote.student as
      | { id: string; nom?: string | null; post_nom?: string | null; prenom?: string | null; email?: string | null; matricule?: string | null }
      | null
      | undefined;

    const noteId = typeof rawNote.id === "string" ? rawNote.id : `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const normalizedNote: TeacherActivityNote = {
      id: noteId,
      activity_id: activityId,
      status: typeof rawNote.status === "string" ? rawNote.status : null,
      note: typeof rawNote.note === "number" ? rawNote.note : null,
      comment: typeof rawNote.comment === "string" ? rawNote.comment : null,
      created_at: typeof rawNote.created_at === "string" ? rawNote.created_at : new Date().toISOString(),
      student: studentRecord
        ? {
            id: studentRecord.id,
            nom: typeof studentRecord.nom === "string" ? studentRecord.nom : null,
            post_nom: typeof studentRecord.post_nom === "string" ? studentRecord.post_nom : null,
            prenom: typeof studentRecord.prenom === "string" ? studentRecord.prenom : null,
            email: typeof studentRecord.email === "string" ? studentRecord.email : null,
          }
        : null,
    };

    const existing = notesByActivityId.get(activityId) ?? [];
    existing.push(normalizedNote);
    notesByActivityId.set(activityId, existing);
  }

  const normalizeActivityCategory = (value: string | null | undefined): Extract<ActivityCategory, "qcm" | "tp"> | null => {
    const normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : null;
    return normalizedValue === "qcm" || normalizedValue === "tp" ? normalizedValue : null;
  };

  const parseQuestions = (value: unknown): TeacherCourseQuestion[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const record = item as Record<string, unknown>;
      const enonce = typeof record.enonce === "string" ? record.enonce.trim() : "";

      if (!enonce) {
        return [];
      }

      const questions: TeacherCourseQuestion = {
        enonce,
      };

      if (Array.isArray(record.items)) {
        questions.items = record.items.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
      }

      if (typeof record.reponseIndex === "number") {
        questions.reponseIndex = record.reponseIndex;
      }

      if (typeof record.pts === "number") {
        questions.pts = record.pts;
      }

      if (typeof record.url === "string" && record.url.trim().length > 0) {
        questions.url = record.url.trim();
      }

      return [questions];
    });
  };

  const activities = ((activityData ?? []) as (ActivityRecord & { questions?: unknown })[])
    .map((activity) => {
      const notes = notesByActivityId.get(activity.id) ?? [];
      const category = normalizeActivityCategory(activity.categorie);

      if (!category) {
        return null;
      }

      return {
        ...activity,
        category,
        questions: parseQuestions(activity.questions),
        notes,
      };
    })
    .filter((activity): activity is TeacherCourseActivity => activity !== null);

  const cotationStudents = await getTeacherCourseCotationStudents(matiereId);

  return {
    ...assignment,
    courseDetails: (courseData ?? null) as CourseDetailRecord | null,
    activities,
    cotationStudents,
  } satisfies TeacherCoursePageDetails;
};

export const getTeacherCourseCotationStudents = async (matiereId: string): Promise<TeacherCourseCotationStudent[]> => {
  const assignment = (await getTeacherAssignedCourses()).find((item) => item.matiere.id === matiereId);

  if (!assignment) {
    throw new Error("programme_access_denied");
  }

  if (!assignment.programme?.id) {
    return [];
  }

  const admin = createAdminClient();
  const { data: parcoursData, error: parcoursError } = await admin
    .from("parcours")
    .select("id, created_at, reference, status, student:students(id, nom, post_nom, prenom, email)")
    .eq("programme_id", assignment.programme.id)
    .order("created_at", { ascending: false });

  if (parcoursError) {
    throw new Error(parcoursError.message);
  }

  const parcoursRows = (parcoursData ?? []) as Array<{
    id: string;
    created_at: string;
    reference: string | null;
    status: string | null;
    student: unknown;
  }>;

  const latestParcoursByStudentId = new Map<string, TeacherCourseCotationStudent>();

  for (const row of parcoursRows) {
    const studentSource = Array.isArray(row.student) ? row.student[0] : row.student;
    const student =
      studentSource && typeof studentSource === "object"
        ? (studentSource as { id?: string; nom?: string | null; post_nom?: string | null; prenom?: string | null; email?: string | null })
        : null;
    const studentId = typeof student?.id === "string" ? student.id : null;

    if (!studentId || latestParcoursByStudentId.has(studentId)) {
      continue;
    }

    latestParcoursByStudentId.set(studentId, {
      parcoursId: row.id,
      reference: row.reference,
      status: row.status,
      student: {
        id: studentId,
        nom: student?.nom ?? null,
        post_nom: student?.post_nom ?? null,
        prenom: student?.prenom ?? null,
        email: student?.email ?? null,
      },
      cotation: null,
    });
  }

  const studentIds = Array.from(latestParcoursByStudentId.keys());

  if (studentIds.length === 0) {
    return [];
  }

  const { data: cotationData, error: cotationError } = await admin
    .from("fiche_cotation")
    .select("id, student_id, cc, examen, rattrapage, rachat, is_validate")
    .eq("matiere_id", matiereId)
    .in("student_id", studentIds);

  if (cotationError) {
    throw new Error(cotationError.message);
  }

  const cotationByStudentId = new Map(
    ((cotationData ?? []) as Array<{
      id: string;
      student_id: string | null;
      cc: number | null;
      examen: number | null;
      rattrapage: number | null;
      rachat: number | null;
      is_validate: string | null;
    }>)
      .filter((row) => row.student_id)
      .map((row) => [
        row.student_id as string,
        {
          id: row.id,
          cc: row.cc,
          examen: row.examen,
          rattrapage: row.rattrapage,
          rachat: row.rachat,
          is_validate: row.is_validate,
        },
      ] as const),
  );

  return Array.from(latestParcoursByStudentId.values())
    .map((row) => ({
      ...row,
      cotation: cotationByStudentId.get(row.student.id) ?? null,
    }))
    .sort((left, right) =>
      buildStudentFullName(left.student).localeCompare(buildStudentFullName(right.student)),
    );
};

export const saveTeacherCourseCotationRows = async (
  matiereId: string,
  rows: TeacherCourseCotationDraftRow[],
) => {
  const cotationStudents = await getTeacherCourseCotationStudents(matiereId);

  if (rows.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  const studentById = new Map(cotationStudents.map((row) => [row.student.id, row] as const));
  const admin = createAdminClient();

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const target = studentById.get(row.studentId);
    if (!target) {
      skipped += 1;
      continue;
    }

    if (target.cotation?.id) {
      skipped += 1;
      continue;
    }

    const cc = parseNullableNoteValue(row.cc);
    const examen = parseNullableNoteValue(row.examen);
    const rattrapage = parseNullableNoteValue(row.rattrapage);
    const rachat = parseNullableNoteValue(row.rachat);

    validateNoteRange(cc, 10, "cc");
    validateNoteRange(examen, 10, "examen");
    validateNoteRange(rattrapage, 20, "rattrapage");
    validateNoteRange(rachat, 20, "rachat");

    if (cc === null || examen === null) {
      skipped += 1;
      continue;
    }

    if (rachat !== null && rattrapage === null) {
      throw new Error("rachat_requires_all_scores");
    }

    const validation = computeTeacherCotationValidation({
      cc,
      examen,
      rattrapage,
      rachat,
    });

    const { error } = await admin.from("fiche_cotation").insert({
      student_id: target.student.id,
      matiere_id: matiereId,
      cc,
      examen,
      rattrapage,
      rachat,
      is_validate: validation.is_validate,
    });

    if (error) {
      throw new Error(error.message);
    }

    inserted += 1;
  }

  return { inserted, skipped };
};

export const exportTeacherCourseCotationTemplateCsv = async (matiereId: string) => {
  const students = await getTeacherCourseCotationStudents(matiereId);
  const header = ["parcours.ref", "student.nomComplet", "cc", "examen", "rattrapage", "rachat"];

  const rows = students.map((row) => [
    row.reference ?? "",
    buildStudentFullName(row.student),
    row.cotation?.cc ?? "",
    row.cotation?.examen ?? "",
    row.cotation?.rattrapage ?? "",
    row.cotation?.rachat ?? "",
  ]);

  return [header, ...rows].map((row) => row.map((entry) => toCsvCell(entry)).join(";")).join("\n");
};

export const importTeacherCourseCotationFromCsv = async (matiereId: string, rawCsv: string) => {
  const normalized = rawCsv.replace(/\r/g, "").trim();
  if (!normalized) {
    throw new Error("csv_empty");
  }

  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("csv_empty");
  }
  const delimiter = detectCsvDelimiter(lines[0]);

  const students = await getTeacherCourseCotationStudents(matiereId);
  const studentByReference = new Map(
    students
      .filter((row) => row.reference && row.reference.trim().length > 0)
      .map((row) => [row.reference!.trim().toLowerCase(), row] as const),
  );

  const parsedRows: TeacherCourseCotationDraftRow[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvRow(line, delimiter);
    const reference = cells[0]?.trim() ?? "";
    if (!reference) continue;

    const target = studentByReference.get(reference.toLowerCase());
    if (!target || target.cotation?.id) {
      continue;
    }

    const cc = parseNullableNoteValue(cells[2] ?? null);
    const examen = parseNullableNoteValue(cells[3] ?? null);
    const rattrapage = parseNullableNoteValue(cells[4] ?? null);
    const rachat = parseNullableNoteValue(cells[5] ?? null);

    parsedRows.push({
      studentId: target.student.id,
      cc,
      examen,
      rattrapage,
      rachat,
    });
  }

  return saveTeacherCourseCotationRows(matiereId, parsedRows);
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const updateTeacherActivityNote = async (
  noteId: string,
  payload: { note?: number | null; status?: string | null; comment?: string | null },
) => {
  if (!noteId) {
    throw new Error("note_required");
  }

  const admin = createAdminClient();
  const { data: noteRecord, error: fetchError } = await admin.from("cmd_activity").select("activity_id").eq("id", noteId).maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!noteRecord || !noteRecord.activity_id) {
    throw new Error("note_not_found");
  }

  await ensureTeacherActivityAccess(noteRecord.activity_id);

  const { error: updateError } = await admin.from("cmd_activity").update(payload).eq("id", noteId);

  if (updateError) {
    throw new Error(updateError.message);
  }
};

export const updateTeacherCourseDescriptor = async (formData: FormData) => {
  const teacherAgentId = await getCurrentAuthenticatedTeacherAgentId();
  const courseId = typeof formData.get("course_id") === "string" ? formData.get("course_id") : null;

  if (!courseId) {
    throw new Error("cours_required");
  }

  const admin = createAdminClient();
  const { data: course, error: courseError } = await admin
    .from("cours")
    .select("id, titulaire_id, matiere_id, slug")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) {
    throw new Error(courseError.message);
  }

  if (!course || course.titulaire_id !== teacherAgentId) {
    throw new Error("teacher_access_denied");
  }

  const payload: Record<string, unknown> = {};
  const setField = (key: string, parser: (value: FormDataEntryValue) => unknown) => {
    if (!formData.has(key)) {
      return;
    }

    const value = formData.get(key);
    if (value !== null) {
      payload[key] = parser(value);
    }
  };

  setField("description", parseStructuredInput);
  setField("objectifs", parseStructuredInput);
  setField("methodologies", parseStructuredInput);
  setField("penalites", parseStructuredInput);
  setField("competences", parseStructuredInput);
  setField("disponiblites", parseStructuredInput);

  if (!course.slug) {
    const { data: matiereData, error: matiereError } = await admin
      .from("matieres")
      .select("designation")
      .eq("id", course.matiere_id)
      .maybeSingle();

    if (matiereError) {
      throw new Error(matiereError.message);
    }

    const defaultSlug = matiereData?.designation ? slugify(matiereData.designation) : `cours-${courseId}`;
    payload.slug = defaultSlug;
  }

  if (Object.keys(payload).length === 0) {
    return;
  }

  const { error } = await admin.from("cours").update(payload).eq("id", courseId);

  if (error) {
    throw new Error(error.message);
  }
};

export const updateTeacherCoursePlan = async (formData: FormData) => {
  const teacherAgentId = await getCurrentAuthenticatedTeacherAgentId();
  const courseIdValue = formData.get("course_id");
  const rawPlanValue = formData.get("plan");
  const courseId = typeof courseIdValue === "string" ? courseIdValue : null;
  const rawPlan = typeof rawPlanValue === "string" ? rawPlanValue : null;

  if (!courseId) {
    throw new Error("cours_required");
  }

  const admin = createAdminClient();
  const { data: course, error: courseError } = await admin
    .from("cours")
    .select("id, titulaire_id")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) {
    throw new Error(courseError.message);
  }

  if (!course || course.titulaire_id !== teacherAgentId) {
    throw new Error("teacher_access_denied");
  }

  let plan: unknown = [];

  if (rawPlan && rawPlan.trim().length > 0) {
    try {
      plan = JSON.parse(rawPlan);
    } catch {
      throw new Error("invalid_plan_json");
    }
  }

  const { error } = await admin.from("cours").update({ plan }).eq("id", courseId);

  if (error) {
    throw new Error(error.message);
  }
};

const ensureTeacherOwnsCourse = async (coursId: string) => {
  if (!coursId) {
    throw new Error("cours_required");
  }

  const teacherAgentId = await getCurrentAuthenticatedTeacherAgentId();
  const admin = createAdminClient();
  const { data, error } = await admin.from("cours").select("id, titulaire_id").eq("id", coursId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.titulaire_id !== teacherAgentId) {
    throw new Error("teacher_access_denied");
  }

  return data;
};

export const ensureTeacherActivityAccess = async (activityId: string) => {
  if (!activityId) {
    throw new Error("activity_required");
  }

  const admin = createAdminClient();
  const { data: activity, error: activityError } = await admin.from("activity").select("id, cours_id").eq("id", activityId).maybeSingle();

  if (activityError) {
    throw new Error(activityError.message);
  }

  if (!activity || !activity.cours_id) {
    throw new Error("activity_not_found");
  }

  await ensureTeacherOwnsCourse(activity.cours_id);

  return activity;
};

export const getTeacherActivityCommandesPageData = async (activityId: string): Promise<TeacherActivityCommandesPageData> => {
  const activityAccess = await ensureTeacherActivityAccess(activityId);
  const assignment = (await getTeacherAssignedCourses()).find((item) => item.cours.id === activityAccess.cours_id);

  if (!assignment) {
    throw new Error("programme_access_denied");
  }

  const admin = createAdminClient();
  const [{ data: rawActivity, error: activityError }, { data: rawNotes, error: notesError }] = await Promise.all([
    admin.from("activity").select("*").eq("id", activityId).maybeSingle(),
    admin
      .from("cmd_activity")
      .select("id, created_at, status, note, comment, student:students(id, nom, post_nom, prenom, email)")
      .eq("activity_id", activityId)
      .order("created_at", { ascending: false }),
  ]);

  if (activityError) {
    throw new Error(activityError.message);
  }

  if (!rawActivity) {
    throw new Error("activity_not_found");
  }

  if (notesError) {
    throw new Error(notesError.message);
  }

  const category = normalizeTeacherActivityCategory(rawActivity.categorie);

  if (!category) {
    throw new Error("activity_category_invalid");
  }

  const commandes = ((rawNotes ?? []) as Array<Record<string, unknown>>).map((row) => {
    const studentRecord = row.student as
      | {
          id: string;
          nom?: string | null;
          post_nom?: string | null;
          prenom?: string | null;
          email?: string | null;
        }
      | null
      | undefined;

    return {
      id: typeof row.id === "string" ? row.id : `cmd-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      status: typeof row.status === "string" ? row.status : null,
      note: typeof row.note === "number" ? row.note : null,
      comment: typeof row.comment === "string" ? row.comment : null,
      student: studentRecord
        ? {
            id: studentRecord.id,
            nom: typeof studentRecord.nom === "string" ? studentRecord.nom : null,
            post_nom: typeof studentRecord.post_nom === "string" ? studentRecord.post_nom : null,
            prenom: typeof studentRecord.prenom === "string" ? studentRecord.prenom : null,
            email: typeof studentRecord.email === "string" ? studentRecord.email : null,
          }
        : null,
    } satisfies TeacherActivityCommandeEditorRow;
  });

  return {
    activity: {
      ...(rawActivity as ActivityRecord),
      category,
    },
    assignment,
    commandes,
  };
};

export const createTeacherActivity = async ({
  coursId,
  designation,
  description,
  categorie,
  montant,
  note,
  date_limite,
}: {
  coursId: string;
  designation: string;
  description: string | null;
  categorie: Extract<ActivityCategory, "qcm" | "tp">;
  montant: number | null;
  note: number | null;
  date_limite: string | null;
}) => {
  await ensureTeacherOwnsCourse(coursId);

  const admin = createAdminClient();
  const { error } = await admin.from("activity").insert({
    cours_id: coursId,
    designation,
    description,
    categorie,
    montant,
    note,
    date_limite,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const updateTeacherActivityQuestions = async (activityId: string, rawQuestions: string | null) => {
  await ensureTeacherActivityAccess(activityId);

  let parsed: unknown[] = [];

  if (rawQuestions && rawQuestions.trim().length > 0) {
    try {
      const parsedValue = JSON.parse(rawQuestions);

      if (!Array.isArray(parsedValue)) {
        throw new Error("invalid_questions_format");
      }

      parsed = parsedValue;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "invalid_questions_format");
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("activity").update({ questions: parsed }).eq("id", activityId);

  if (error) {
    throw new Error(error.message);
  }
};
