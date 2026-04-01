import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
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

      return (left.designation ?? "").localeCompare(right.designation ?? "");
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

  return {
    ...assignment,
    courseDetails: (courseData ?? null) as CourseDetailRecord | null,
    activities,
  } satisfies TeacherCoursePageDetails;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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
  const courseId = typeof formData.get("course_id") === "string" ? formData.get("course_id") : null;
  const rawPlan = typeof formData.get("plan") === "string" ? formData.get("plan") : null;

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
