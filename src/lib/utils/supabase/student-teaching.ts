import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getCurrentAuthenticatedStudent } from "@/lib/utils/supabase/commandes";
import type { CoursRecord, MatiereRecord, SemestreRecord, UniteRecord } from "@/lib/utils/supabase/enseignement";

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

type FiliereRecord = {
  id: string;
  designation: string | null;
};

type AnneeRecord = {
  id: string;
  designation: string | null;
  date_debut: string | null;
  date_fin: string | null;
  active: string | null;
};

export type StudentProgrammeMatiere = MatiereRecord & {
  cours: CoursRecord | null;
};

export type StudentProgrammeUnite = UniteRecord & {
  matieres: StudentProgrammeMatiere[];
  matieresCount: number;
  usedCredits: number;
};

export type StudentProgrammeSemestre = SemestreRecord & {
  unites: StudentProgrammeUnite[];
  unitesCount: number;
  matieresCount: number;
  usedCredits: number;
};

export type StudentProgrammePageData = {
  student: Awaited<ReturnType<typeof getCurrentAuthenticatedStudent>>;
  programme: ProgrammeRecord & {
    filiereDesignation: string | null;
    anneeDesignation: string | null;
    isActiveYear: boolean;
  };
  annee: AnneeRecord | null;
  parcours: {
    id: string;
    status: string | null;
    reference: string | null;
  };
  semestres: StudentProgrammeSemestre[];
  summary: {
    semestreCount: number;
    uniteCount: number;
    matiereCount: number;
    totalCredits: number;
  };
};

export type StudentCoursePageData = {
  student: Awaited<ReturnType<typeof getCurrentAuthenticatedStudent>>;
  programme: StudentProgrammePageData["programme"];
  annee: AnneeRecord | null;
  semestre: SemestreRecord;
  unite: UniteRecord;
  matiere: StudentProgrammeMatiere;
};

const assertStudentCanAccessProgramme = async (studentId: string, programmeId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("parcours")
    .select("id, status, reference")
    .eq("student_id", studentId)
    .eq("programme_id", programmeId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("programme_access_denied");
  }

  return data as { id: string; status: string | null; reference: string | null };
};

const getProgrammeBaseData = async (programmeId: string) => {
  const admin = createAdminClient();

  const [{ data: programmeData, error: programmeError }, { data: activeAnneeData, error: activeAnneeError }, { data: filieresData, error: filieresError }] =
    await Promise.all([
      admin
        .from("programmes")
        .select("id, created_at, filiere_id, designation, description, annee_id, slug, groupe_id, systeme")
        .eq("id", programmeId)
        .maybeSingle(),
      admin
        .from("annees")
        .select("id, designation, date_debut, date_fin, active")
        .eq("active", "true")
        .order("date_debut", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      admin.from("filieres").select("id, designation"),
    ]);

  if (programmeError) {
    throw new Error(programmeError.message);
  }

  if (activeAnneeError) {
    throw new Error(activeAnneeError.message);
  }

  if (filieresError) {
    throw new Error(filieresError.message);
  }

  if (!programmeData) {
    throw new Error("programme_not_found");
  }

  const programme = programmeData as ProgrammeRecord;
  const activeAnnee = (activeAnneeData ?? null) as AnneeRecord | null;
  const filieresById = new Map(((filieresData ?? []) as FiliereRecord[]).map((item) => [item.id, item.designation] as const));

  return {
    programme: {
      ...programme,
      filiereDesignation: programme.filiere_id ? filieresById.get(programme.filiere_id) ?? null : null,
      anneeDesignation: activeAnnee && programme.annee_id === activeAnnee.id ? activeAnnee.designation ?? null : null,
      isActiveYear: Boolean(activeAnnee?.id && programme.annee_id === activeAnnee.id),
    },
    activeAnnee,
  };
};

export const getStudentProgrammePageData = async (programmeId: string): Promise<StudentProgrammePageData> => {
  const admin = createAdminClient();
  const student = await getCurrentAuthenticatedStudent();
  const [parcours, { programme, activeAnnee }] = await Promise.all([
    assertStudentCanAccessProgramme(student.id, programmeId),
    getProgrammeBaseData(programmeId),
  ]);

  const { data: semestresData, error: semestresError } = await admin
    .from("semestres")
    .select("id, created_at, designation, credits, programme_id")
    .eq("programme_id", programmeId)
    .order("created_at", { ascending: true });

  if (semestresError) {
    throw new Error(semestresError.message);
  }

  const semestres = (semestresData ?? []) as SemestreRecord[];
  const semestreIds = semestres.map((item) => item.id);

  const { data: unitesData, error: unitesError } =
    semestreIds.length > 0
      ? await admin
          .from("unites")
          .select("id, created_at, semestre_id, designation, code, credits")
          .in("semestre_id", semestreIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

  if (unitesError) {
    throw new Error(unitesError.message);
  }

  const unites = (unitesData ?? []) as UniteRecord[];
  const uniteIds = unites.map((item) => item.id);

  const { data: matieresData, error: matieresError } =
    uniteIds.length > 0
      ? await admin
          .from("matieres")
          .select("id, created_at, designation, unite_id, credits")
          .in("unite_id", uniteIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

  if (matieresError) {
    throw new Error(matieresError.message);
  }

  const matieres = (matieresData ?? []) as MatiereRecord[];
  const matiereIds = matieres.map((item) => item.id);

  const { data: coursData, error: coursError } =
    matiereIds.length > 0
      ? await admin
          .from("cours")
          .select("id, created_at, matiere_id, titulaire_id, slug, entra_id")
          .in("matiere_id", matiereIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

  if (coursError) {
    throw new Error(coursError.message);
  }

  const coursByMatiereId = new Map(((coursData ?? []) as CoursRecord[]).map((item) => [item.matiere_id ?? "", item] as const));

  const unitesWithMatieres: StudentProgrammeUnite[] = unites.map((unite) => {
    const uniteMatieres = matieres
      .filter((matiere) => matiere.unite_id === unite.id)
      .map((matiere) => ({
        ...matiere,
        cours: coursByMatiereId.get(matiere.id) ?? null,
      }));

    return {
      ...unite,
      matieres: uniteMatieres,
      matieresCount: uniteMatieres.length,
      usedCredits: uniteMatieres.reduce((total, item) => total + (item.credits ?? 0), 0),
    };
  });

  const semestresWithData: StudentProgrammeSemestre[] = semestres.map((semestre) => {
    const semestreUnites = unitesWithMatieres.filter((unite) => unite.semestre_id === semestre.id);

    return {
      ...semestre,
      unites: semestreUnites,
      unitesCount: semestreUnites.length,
      matieresCount: semestreUnites.reduce((total, unite) => total + unite.matieresCount, 0),
      usedCredits: semestreUnites.reduce((total, unite) => total + (unite.credits ?? 0), 0),
    };
  });

  return {
    student,
    programme,
    annee: activeAnnee,
    parcours,
    semestres: semestresWithData,
    summary: {
      semestreCount: semestresWithData.length,
      uniteCount: unitesWithMatieres.length,
      matiereCount: matieres.length,
      totalCredits: semestresWithData.reduce((total, semestre) => total + (semestre.credits ?? 0), 0),
    },
  };
};

export const getStudentCoursePageData = async (matiereId: string): Promise<StudentCoursePageData> => {
  const admin = createAdminClient();
  const student = await getCurrentAuthenticatedStudent();

  const { data: matiereData, error: matiereError } = await admin
    .from("matieres")
    .select("id, created_at, designation, unite_id, credits")
    .eq("id", matiereId)
    .maybeSingle();

  if (matiereError) {
    throw new Error(matiereError.message);
  }

  if (!matiereData) {
    throw new Error("matiere_not_found");
  }

  const matiere = matiereData as MatiereRecord;

  if (!matiere.unite_id) {
    throw new Error("matiere_unite_missing");
  }

  const [{ data: uniteData, error: uniteError }, { data: coursData, error: coursError }] = await Promise.all([
    admin
      .from("unites")
      .select("id, created_at, semestre_id, designation, code, credits")
      .eq("id", matiere.unite_id)
      .maybeSingle(),
    admin
      .from("cours")
      .select("id, created_at, matiere_id, titulaire_id, slug, entra_id")
      .eq("matiere_id", matiere.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (uniteError) {
    throw new Error(uniteError.message);
  }

  if (coursError) {
    throw new Error(coursError.message);
  }

  if (!uniteData) {
    throw new Error("unite_not_found");
  }

  const unite = uniteData as UniteRecord;

  if (!unite.semestre_id) {
    throw new Error("unite_semestre_missing");
  }

  const { data: semestreData, error: semestreError } = await admin
    .from("semestres")
    .select("id, created_at, designation, credits, programme_id")
    .eq("id", unite.semestre_id)
    .maybeSingle();

  if (semestreError) {
    throw new Error(semestreError.message);
  }

  if (!semestreData) {
    throw new Error("semestre_not_found");
  }

  const semestre = semestreData as SemestreRecord;

  if (!semestre.programme_id) {
    throw new Error("programme_not_found");
  }

  await assertStudentCanAccessProgramme(student.id, semestre.programme_id);
  const { programme, activeAnnee } = await getProgrammeBaseData(semestre.programme_id);

  return {
    student,
    programme,
    annee: activeAnnee,
    semestre,
    unite,
    matiere: {
      ...matiere,
      cours: (coursData as CoursRecord | null) ?? null,
    },
  };
};
