import { createAdminClient } from "@/lib/utils/supabase/admin";
import type { ProgrammeRecord } from "@/lib/utils/supabase/programmes";
import type { NotesEtudiant } from "@/utils/excel/NoteManager";

export type JuryRecord = {
  id: string;
  created_at: string;
  designation: string | null;
  annee_id: string | null;
  president_id: string | null;
  secretaire_id: string | null;
  isActivate: boolean | null;
  password: string | null;
};

export type JuryWithMembers = JuryRecord & {
  president: Pick<
    {
      id: string;
      nom: string | null;
      post_nom: string | null;
      prenom: string | null;
    },
    "id" | "nom" | "post_nom" | "prenom"
  > | null;
  secretaire: Pick<
    {
      id: string;
      nom: string | null;
      post_nom: string | null;
      prenom: string | null;
    },
    "id" | "nom" | "post_nom" | "prenom"
  > | null;
  annee: {
    id: string;
    designation: string | null;
  } | null;
};

type AgentSummary = Pick<
  NonNullable<JuryWithMembers["president"]>,
  "id" | "nom" | "post_nom" | "prenom"
>;

type AnneeSummary = NonNullable<JuryWithMembers["annee"]>;

const buildAgentMap = (agents: AgentSummary[]) =>
  new Map(agents.map((agent) => [agent.id, agent] as const));

const buildAnneeMap = (annees: AnneeSummary[]) =>
  new Map(annees.map((annee) => [annee.id, annee] as const));

export const getProgrammesByYear = async (anneeId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("programmes")
    .select("*")
    .eq("annee_id", anneeId)
    .order("designation", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProgrammeRecord[];
};

export const getStudentsForProgramme = async (programmeId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("parcours")
    .select("id, created_at, reference, student:students(id, nom, post_nom, prenom)")
    .eq("programme_id", programmeId)
    // Dernière inscription en premier pour dédupliquer (si un étudiant a plusieurs parcours)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    created_at: string;
    reference: string | null;
    student: unknown;
  }>;

  const studentsById = new Map<
    string,
    {
      id: string;
      matricule: string | null;
      nom: string | null;
      post_nom: string | null;
      prenom: string | null;
    }
  >();

  for (const row of rows) {
    const studentSource = Array.isArray(row.student) ? row.student[0] : row.student;
    const student =
      studentSource && typeof studentSource === "object"
        ? (studentSource as { id?: string; nom?: string | null; post_nom?: string | null; prenom?: string | null })
        : null;

    const studentId = typeof student?.id === "string" ? student.id : null;

    if (!studentId) continue;
    if (studentsById.has(studentId)) continue;

    studentsById.set(studentId, {
      id: studentId,
      nom: student?.nom ?? null,
      post_nom: student?.post_nom ?? null,
      prenom: student?.prenom ?? null,
      matricule: row.reference,
    });
  }

  return Array.from(studentsById.values());
};

const JURY_FIELDS = [
  "id",
  "created_at",
  "designation",
  "annee_id",
  "president_id",
  "secretaire_id",
  "isActivate",
  "password",
] as const;

type JuryRow = JuryRecord & {
  president_id: string | null;
  secretaire_id: string | null;
};

const mapJuryMembers = (
  jury: JuryRow,
  agents: Map<string, AgentSummary>,
  annees: Map<string, AnneeSummary>,
): JuryWithMembers => ({
  ...jury,
  president: jury.president_id ? agents.get(jury.president_id) ?? null : null,
  secretaire: jury.secretaire_id ? agents.get(jury.secretaire_id) ?? null : null,
  annee: jury.annee_id ? annees.get(jury.annee_id) ?? null : null,
});

export const getJuryById = async (juryId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jury")
    .select(JURY_FIELDS.join(","))
    .eq("id", juryId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const jury = data as unknown as JuryRow;
  const agentIds = [jury.president_id, jury.secretaire_id].filter(
    (value): value is string => Boolean(value),
  );
  const anneeIds = jury.annee_id ? [jury.annee_id] : [];

  const [agentsMap, anneesMap] = await Promise.all([
    fetchAgentsByIds(agentIds),
    fetchAnneesByIds(anneeIds),
  ]);

  return mapJuryMembers(jury, agentsMap, anneesMap);
};

export const getAllJuries = async () => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jury")
    .select(JURY_FIELDS.join(","))
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const juries = (data ?? []) as unknown as JuryRow[];
  const agentIds = Array.from(
    new Set(
      juries.flatMap((jury) =>
        [jury.president_id, jury.secretaire_id].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ),
  );
  const anneeIds = Array.from(
    new Set(juries.map((jury) => jury.annee_id).filter((value): value is string => Boolean(value))),
  );

  const [agentsMap, anneesMap] = await Promise.all([
    fetchAgentsByIds(agentIds),
    fetchAnneesByIds(anneeIds),
  ]);

  return juries.map((jury) => mapJuryMembers(jury, agentsMap, anneesMap));
}

export const getJuriesForAgent = async (agentId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jury")
    .select(JURY_FIELDS.join(","))
    .or(`president_id.eq.${agentId},secretaire_id.eq.${agentId}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const juries = (data ?? []) as unknown as JuryRow[];
  const agentIds = Array.from(
    new Set(
      juries.flatMap((jury) =>
        [jury.president_id, jury.secretaire_id].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ),
  );
  const anneeIds = Array.from(
    new Set(juries.map((jury) => jury.annee_id).filter((value): value is string => Boolean(value))),
  );

  const [agentsMap, anneesMap] = await Promise.all([
    fetchAgentsByIds(agentIds),
    fetchAnneesByIds(anneeIds),
  ]);

  return juries.map((jury) => mapJuryMembers(jury, agentsMap, anneesMap));
};

export const getJuriesByYear = async (anneeId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jury")
    .select(JURY_FIELDS.join(","))
    .eq("annee_id", anneeId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const juries = (data ?? []) as unknown as JuryRow[];
  const agentIds = Array.from(
    new Set(
      juries.flatMap((jury) =>
        [jury.president_id, jury.secretaire_id].filter((value): value is string => Boolean(value)),
      ),
    ),
  );
  const [agentsMap, anneesMap] = await Promise.all([
    fetchAgentsByIds(agentIds),
    fetchAnneesByIds([anneeId]),
  ]);

  return juries.map((jury) => mapJuryMembers(jury, agentsMap, anneesMap));
};

const fetchAgentsByIds = async (agentIds: string[]) => {
  if (agentIds.length === 0) {
    return new Map<string, AgentSummary>();
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agents")
    .select("id, nom, post_nom, prenom")
    .in("id", agentIds);

  if (error) {
    throw new Error(error.message);
  }

  const agents = (data ?? []) as AgentSummary[];
  return buildAgentMap(agents);
};

const fetchAnneesByIds = async (anneeIds: string[]) => {
  if (anneeIds.length === 0) {
    return new Map<string, AnneeSummary>();
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("annees")
    .select("id, designation")
    .in("id", anneeIds);

  if (error) {
    throw new Error(error.message);
  }

  const annees = (data ?? []) as AnneeSummary[];
  return buildAnneeMap(annees);
};

export const getNotesForProgramme = async (programmeId: string) => {
  const admin = createAdminClient();
  const students = await getStudentsForProgramme(programmeId);

  const { data: semestresData, error: semestresError } = await admin
    .from("semestres")
    .select("id, created_at, designation, credits")
    .eq("programme_id", programmeId)
    .order("created_at", { ascending: true });

  if (semestresError) {
    throw new Error(semestresError.message);
  }

  const semestres = (semestresData ?? []) as Array<{
    id: string;
    designation: string | null;
    credits: number | null;
    created_at: string;
  }>;

  const semestreIds = semestres.map((semestre) => semestre.id);

  const { data: unitesData, error: unitesError } = semestreIds.length
    ? await admin
        .from("unites")
        .select("id, created_at, semestre_id, designation, code, credits")
        .in("semestre_id", semestreIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (unitesError) {
    throw new Error(unitesError.message);
  }

  const unites = (unitesData ?? []) as Array<{
    id: string;
    created_at: string;
    semestre_id: string | null;
    designation: string | null;
    code: string | null;
    credits: number | null;
  }>;

  const uniteIds = unites.map((unite) => unite.id);

  const { data: matieresData, error: matieresError } = uniteIds.length
    ? await admin
        .from("matieres")
        .select("id, created_at, unite_id, designation, credits")
        .in("unite_id", uniteIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (matieresError) {
    throw new Error(matieresError.message);
  }

  const matieres = (matieresData ?? []) as Array<{
    id: string;
    created_at: string;
    unite_id: string | null;
    designation: string | null;
    credits: number | null;
  }>;

  const studentIds = students.map((student) => student.id);
  const matiereIds = matieres.map((matiere) => matiere.id);

  type FicheCotationRow = {
    student_id: string | null;
    matiere_id: string | null;
    cc: number | null;
    examen: number | null;
    rattrapage: number | null;
    rachat: number | null;
  };

  const chunk = <T,>(values: T[], size: number) => {
    const chunks: T[][] = [];
    for (let i = 0; i < values.length; i += size) {
      chunks.push(values.slice(i, i + size));
    }
    return chunks;
  };

  const ficheRows: FicheCotationRow[] = [];
  if (studentIds.length > 0 && matiereIds.length > 0) {
    const studentChunks = chunk(studentIds, 150);
    for (const studentChunk of studentChunks) {
      const { data, error } = await admin
        .from("fiche_cotation")
        .select("student_id, matiere_id, cc, examen, rattrapage, rachat")
        .in("student_id", studentChunk)
        .in("matiere_id", matiereIds);

      if (error) {
        throw new Error(error.message);
      }

      ficheRows.push(...((data ?? []) as FicheCotationRow[]));
    }
  }

  const ficheByStudentMatiere = new Map<string, FicheCotationRow>();
  for (const row of ficheRows) {
    if (!row.student_id || !row.matiere_id) continue;
    ficheByStudentMatiere.set(`${row.student_id}:${row.matiere_id}`, row);
  }

  const unitesBySemestreId = new Map<string, typeof unites>();
  for (const unite of unites) {
    if (!unite.semestre_id) continue;
    const list = unitesBySemestreId.get(unite.semestre_id) ?? [];
    list.push(unite);
    unitesBySemestreId.set(unite.semestre_id, list);
  }

  const matieresByUniteId = new Map<string, typeof matieres>();
  for (const matiere of matieres) {
    if (!matiere.unite_id) continue;
    const list = matieresByUniteId.get(matiere.unite_id) ?? [];
    list.push(matiere);
    matieresByUniteId.set(matiere.unite_id, list);
  }

  return students.map((student): NotesEtudiant => {
    const studentName = [student.prenom, student.post_nom, student.nom]
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      studentId: student.id,
      studentName: studentName || student.matricule || student.id,
      matricule: student.matricule ?? "",
      semestres: semestres.map((semestre) => {
        const semUnites = unitesBySemestreId.get(semestre.id) ?? [];
        return {
          _id: semestre.id,
          designation: semestre.designation ?? "Semestre",
          credit: semestre.credits ?? 0,
          unites: semUnites.map((unite) => {
            const uniteMatieres = matieresByUniteId.get(unite.id) ?? [];
            return {
              _id: unite.id,
              code: unite.code ?? "",
              designation: unite.designation ?? "Unité",
              credit: unite.credits ?? 0,
              elements: uniteMatieres.map((matiere) => {
                const fiche =
                  ficheByStudentMatiere.get(`${student.id}:${matiere.id}`) ?? null;
                return {
                  _id: matiere.id,
                  designation: matiere.designation ?? "Matière",
                  credit: matiere.credits ?? 0,
                  cc: fiche?.cc ?? 0,
                  examen: fiche?.examen ?? 0,
                  rattrapage: fiche?.rattrapage ?? 0,
                  rachat: fiche?.rachat ?? 0,
                };
              }),
            };
          }),
        };
      }),
    };
  });
};
