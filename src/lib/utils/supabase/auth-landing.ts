import { createAdminClient } from "@/lib/utils/supabase/admin";

type ActiveAnneeRecord = {
  id: string;
  designation: string | null;
  date_debut: string | null;
  date_fin: string | null;
};

export type AuthLandingMetrics = {
  activeAnnee: {
    id: string;
    designation: string;
    rangeLabel: string;
  } | null;
  counts: {
    programmes: number;
    unites: number;
    elementsConstitutifs: number;
  };
};

const formatDate = (value: string | null) => {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
};

const buildRangeLabel = (annee: ActiveAnneeRecord | null) => {
  if (!annee) {
    return "Année académique non définie";
  }

  const start = formatDate(annee.date_debut);
  const end = formatDate(annee.date_fin);

  if (start && end) {
    return `${start} - ${end}`;
  }

  return start ?? end ?? "Période non renseignée";
};

export const getAuthLandingMetrics = async (): Promise<AuthLandingMetrics> => {
  const admin = createAdminClient();
  const { data: activeAnneeData, error: activeAnneeError } = await admin
    .from("annees")
    .select("id, designation, date_debut, date_fin")
    .eq("active", "true")
    .order("date_debut", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log("activeAnneeData", activeAnneeData);
  console.log("activeAnneeError", activeAnneeError);

  if (activeAnneeError) {
    throw new Error(activeAnneeError.message);
  }

  const activeAnnee = (activeAnneeData ?? null) as ActiveAnneeRecord | null;

  if (!activeAnnee?.id) {
    return {
      activeAnnee: null,
      counts: {
        programmes: 0,
        unites: 0,
        elementsConstitutifs: 0,
      },
    };
  }

  const { data: programmesData, error: programmesError } = await admin
    .from("programmes")
    .select("id")
    .eq("annee_id", activeAnnee.id);

  if (programmesError) {
    throw new Error(programmesError.message);
  }

  const programmeIds = (programmesData ?? [])
    .map((programme) => programme.id)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  const { data: semestresData, error: semestresError } = programmeIds.length
    ? await admin.from("semestres").select("id").in("programme_id", programmeIds)
    : { data: [], error: null };

  if (semestresError) {
    throw new Error(semestresError.message);
  }

  const semestreIds = (semestresData ?? [])
    .map((semestre) => semestre.id)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  const { data: unitesData, error: unitesError } = semestreIds.length
    ? await admin.from("unites").select("id").in("semestre_id", semestreIds)
    : { data: [], error: null };

  if (unitesError) {
    throw new Error(unitesError.message);
  }

  const uniteIds = (unitesData ?? [])
    .map((unite) => unite.id)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  const { data: matieresData, error: matieresError } = uniteIds.length
    ? await admin.from("matieres").select("id").in("unite_id", uniteIds)
    : { data: [], error: null };

  if (matieresError) {
    throw new Error(matieresError.message);
  }

  return {
    activeAnnee: {
      id: activeAnnee.id,
      designation: activeAnnee.designation ?? "Année académique en cours",
      rangeLabel: buildRangeLabel(activeAnnee),
    },
    counts: {
      programmes: programmeIds.length,
      unites: uniteIds.length,
      elementsConstitutifs: (matieresData ?? []).length,
    },
  };
};
