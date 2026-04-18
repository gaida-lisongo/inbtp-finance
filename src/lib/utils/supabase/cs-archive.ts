import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { getMatieresByUnite, getSemestresByProgramme, getUnitesBySemestreIds } from "@/lib/utils/supabase/enseignement";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

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

export type CsArchiveMatiere = {
  id: string;
  designation: string | null;
  credits: number | null;
  unite: {
    id: string;
    code: string | null;
    designation: string | null;
  } | null;
  semestre: {
    id: string;
    designation: string | null;
  } | null;
};

export type CsArchiveStudent = {
  id: string;
  studentId: string;
  reference: string | null;
  status: string | null;
  student: {
    id: string;
    nom: string | null;
    post_nom: string | null;
    prenom: string | null;
    email: string | null;
  };
  notesByMatiereId: Record<
    string,
    {
      id: string | null;
      cc: number | null;
      examen: number | null;
      rattrapage: number | null;
      rachat: number | null;
      is_validate: string | null;
    }
  >;
};

export type CsArchiveSnapshot = {
  programme: ProgrammeRecord;
  annee: AnneeRecord | null;
  matieres: CsArchiveMatiere[];
  students: CsArchiveStudent[];
};

export type CsBulkRattrapageRow = {
  mail: string;
  notes: Array<{
    matiere_id: string;
    rattrapage: number;
  }>;
};

const roundNote = (value: number) => Math.round(value * 100) / 100;

const parseNullableNoteValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? roundNote(parsed) : null;
};

const computeValidation = (input: {
  cc: number | null;
  examen: number | null;
  rattrapage: number | null;
  rachat: number | null;
}) => {
  const session = roundNote((input.cc ?? 0) + (input.examen ?? 0));
  const final = input.rachat !== null ? input.rachat : Math.max(session, input.rattrapage ?? 0);
  return final >= 10 ? "V" : "NV";
};

const assertCanAccessCs = async () => {
  const user = await getAuthenticatedUser();
  if (!user || !user.canAccessAdmin || !user.agentId) {
    throw new Error("access_denied");
  }
  const codes = await getActiveAutorisationCodesForAgent(user.agentId);
  if (!codes.includes("CS")) {
    throw new Error("access_denied");
  }
};

const buildStudentName = (student: {
  nom?: string | null;
  post_nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  id?: string | null;
}) =>
  [student.prenom, student.post_nom, student.nom].filter(Boolean).join(" ").trim() ||
  student.email ||
  student.id ||
  "Etudiant";

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const getEmailLocalPart = (value: string) => {
  const normalized = normalizeEmail(value);
  const atIndex = normalized.indexOf("@");
  return atIndex > 0 ? normalized.slice(0, atIndex) : normalized;
};

export const getCsArchiveSnapshot = async (
  anneeId: string,
  programmeId: string,
): Promise<CsArchiveSnapshot> => {
  await assertCanAccessCs();
  const admin = createAdminClient();

  const [{ data: programmeData, error: programmeError }, { data: anneeData, error: anneeError }] = await Promise.all([
    admin.from("programmes").select("id, designation, annee_id, slug").eq("id", programmeId).maybeSingle(),
    admin.from("annees").select("id, designation, active, date_debut, created_at").eq("id", anneeId).maybeSingle(),
  ]);

  if (programmeError) {
    throw new Error(programmeError.message);
  }
  if (anneeError) {
    throw new Error(anneeError.message);
  }
  if (!programmeData) {
    throw new Error("programme_not_found");
  }
  if (programmeData.annee_id && programmeData.annee_id !== anneeId) {
    throw new Error("programme_not_found");
  }

  // Meme workflow que /ce : semestres -> unites -> matieres
  const semestres = await getSemestresByProgramme(programmeId);
  const unites = await getUnitesBySemestreIds(semestres.map((item) => item.id));
  const matieresByUnite = await Promise.all(
    unites.map(async (unite) => ({
      uniteId: unite.id,
      matieres: await getMatieresByUnite(unite.id),
    })),
  );
  const matieresData = matieresByUnite.flatMap((item) => item.matieres);

  const uniteById = new Map(unites.map((item) => [item.id, item] as const));
  const semestreById = new Map(semestres.map((item) => [item.id, item] as const));

  const matieres: CsArchiveMatiere[] = ((matieresData ?? []) as Array<{
    id: string;
    designation: string | null;
    credits: number | null;
    unite_id: string | null;
  }>).map((matiere) => {
    const unite = matiere.unite_id ? uniteById.get(matiere.unite_id) ?? null : null;
    const semestre = unite?.semestre_id ? semestreById.get(unite.semestre_id) ?? null : null;

    return {
      id: matiere.id,
      designation: matiere.designation,
      credits: matiere.credits,
      unite: unite
        ? {
            id: unite.id,
            code: unite.code,
            designation: unite.designation,
          }
        : null,
      semestre: semestre
        ? {
            id: semestre.id,
            designation: semestre.designation,
          }
        : null,
    };
  });

  const { data: parcoursData, error: parcoursError } = await admin
    .from("parcours")
    .select("id, created_at, reference, status, student:students(id, nom, post_nom, prenom, email)")
    .eq("programme_id", programmeId)
    .order("created_at", { ascending: false });
  if (parcoursError) {
    throw new Error(parcoursError.message);
  }

  const studentsById = new Map<string, CsArchiveStudent>();
  for (const row of (parcoursData ?? []) as Array<{
    id: string;
    created_at: string;
    reference: string | null;
    status: string | null;
    student: unknown;
  }>) {
    const studentSource = Array.isArray(row.student) ? row.student[0] : row.student;
    const student =
      studentSource && typeof studentSource === "object"
        ? (studentSource as {
            id?: string;
            nom?: string | null;
            post_nom?: string | null;
            prenom?: string | null;
            email?: string | null;
          })
        : null;
    const studentId = typeof student?.id === "string" ? student.id : null;
    if (!studentId || studentsById.has(studentId)) continue;

    studentsById.set(studentId, {
      id: row.id,
      studentId,
      reference: row.reference,
      status: row.status,
      student: {
        id: studentId,
        nom: student?.nom ?? null,
        post_nom: student?.post_nom ?? null,
        prenom: student?.prenom ?? null,
        email: student?.email ?? null,
      },
      notesByMatiereId: {},
    });
  }

  const studentIds = Array.from(studentsById.keys());
  const matiereIds = matieres.map((item) => item.id);

  if (studentIds.length > 0 && matiereIds.length > 0) {
    const { data: notesData, error: notesError } = await admin
      .from("fiche_cotation")
      .select("id, student_id, matiere_id, cc, examen, rattrapage, rachat, is_validate")
      .in("student_id", studentIds)
      .in("matiere_id", matiereIds);
    if (notesError) {
      throw new Error(notesError.message);
    }

    for (const note of (notesData ?? []) as Array<{
      id: string;
      student_id: string | null;
      matiere_id: string | null;
      cc: number | null;
      examen: number | null;
      rattrapage: number | null;
      rachat: number | null;
      is_validate: string | null;
    }>) {
      if (!note.student_id || !note.matiere_id) continue;
      const student = studentsById.get(note.student_id);
      if (!student) continue;
      student.notesByMatiereId[note.matiere_id] = {
        id: note.id,
        cc: note.cc,
        examen: note.examen,
        rattrapage: note.rattrapage,
        rachat: note.rachat,
        is_validate: note.is_validate,
      };
    }
  }

  const students = Array.from(studentsById.values()).sort((a, b) =>
    buildStudentName(a.student).localeCompare(buildStudentName(b.student)),
  );

  return {
    programme: programmeData as ProgrammeRecord,
    annee: (anneeData as AnneeRecord | null) ?? null,
    matieres,
    students,
  };
};

export const saveCsBulkRattrapageRows = async (
  anneeId: string,
  programmeId: string,
  rows: CsBulkRattrapageRow[],
) => {
  const snapshot = await getCsArchiveSnapshot(anneeId, programmeId);
  const admin = createAdminClient();

  const studentByEmail = new Map(
    snapshot.students
      .filter((item) => typeof item.student.email === "string" && item.student.email.trim().length > 0)
      .map((item) => [normalizeEmail(item.student.email!), item] as const),
  );
  const studentByLocalPart = new Map(
    snapshot.students
      .filter((item) => typeof item.student.email === "string" && item.student.email.trim().length > 0)
      .map((item) => [getEmailLocalPart(item.student.email!), item] as const),
  );
  const allowedMatiereIds = new Set(snapshot.matieres.map((item) => item.id));
  const studentIds = snapshot.students.map((item) => item.student.id);

  const { data: existingData, error: existingError } =
    studentIds.length > 0 && allowedMatiereIds.size > 0
      ? await admin
          .from("fiche_cotation")
          .select("id, student_id, matiere_id, cc, examen, rattrapage, rachat")
          .in("student_id", studentIds)
          .in("matiere_id", Array.from(allowedMatiereIds))
      : { data: [], error: null };

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingByPair = new Map(
    ((existingData ?? []) as Array<{
      id: string;
      student_id: string | null;
      matiere_id: string | null;
      cc: number | null;
      examen: number | null;
      rattrapage: number | null;
      rachat: number | null;
    }>)
      .filter((row) => row.student_id && row.matiere_id)
      .map((row) => [`${row.student_id}:${row.matiere_id}`, row] as const),
  );

  let matchedStudents = 0;
  let upserts = 0;
  let skippedUnknownStudents = 0;
  let skippedUnknownMatieres = 0;
  let invalidValues = 0;

  for (const row of rows) {
    const email = normalizeEmail(row.mail);
    const student = studentByEmail.get(email) ?? studentByLocalPart.get(getEmailLocalPart(email));
    if (!student) {
      skippedUnknownStudents += 1;
      continue;
    }
    matchedStudents += 1;

    for (const note of row.notes) {
      if (!allowedMatiereIds.has(note.matiere_id)) {
        skippedUnknownMatieres += 1;
        continue;
      }

      const value = parseNullableNoteValue(note.rattrapage);
      if (value === null || value < 0 || value > 20) {
        invalidValues += 1;
        continue;
      }

      const key = `${student.student.id}:${note.matiere_id}`;
      const existing = existingByPair.get(key) ?? null;

      if (existing?.id) {
        const validation = computeValidation({
          cc: parseNullableNoteValue(existing.cc),
          examen: parseNullableNoteValue(existing.examen),
          rattrapage: value,
          rachat: parseNullableNoteValue(existing.rachat),
        });
        const { error } = await admin
          .from("fiche_cotation")
          .update({ rattrapage: value, is_validate: validation })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const validation = computeValidation({
          cc: null,
          examen: null,
          rattrapage: value,
          rachat: null,
        });
        const { error } = await admin.from("fiche_cotation").insert({
          student_id: student.student.id,
          matiere_id: note.matiere_id,
          rattrapage: value,
          is_validate: validation,
        });
        if (error) throw new Error(error.message);
      }

      upserts += 1;
    }
  }

  return {
    ok: true,
    totalRows: rows.length,
    matchedStudents,
    upserts,
    invalidValues,
    skippedUnknownStudents,
    skippedUnknownMatieres,
  };
};
