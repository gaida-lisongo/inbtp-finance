import { createAdminClient } from "@/lib/utils/supabase/admin";
import type { ProgrammeRecord } from "@/lib/utils/supabase/programmes";

export type JuryRecord = {
  id: string;
  created_at: string;
  designation: string | null;
  annee_id: string | null;
  president_id: string | null;
  secretaire_id: string | null;
  isActivate: boolean | null;
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
    .select("student:students(id, matricule, nom, post_nom, prenom)")
    .eq("programme_id", programmeId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    (data ?? []) as Array<{
      student: {
        id: string;
        matricule: string | null;
        nom: string | null;
        post_nom: string | null;
        prenom: string | null;
      } | null;
    }>
  )
    .map((row) => row.student)
    .filter((student): student is NonNullable<typeof student> => Boolean(student));
};

const formatAgent = (
  agent: JuryWithMembers["president"] | JuryWithMembers["secretaire"],
) => {
  if (!agent) {
    return "Non renseigné";
  }
  const parts = [agent.prenom, agent.post_nom, agent.nom].filter(Boolean);
  return parts.join(" ") || "Non renseigné";
};

export const getJuriesForAgent = async (agentId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jury")
    .select(
      [
        "id",
        "created_at",
        "designation",
        "annee_id",
        "isActivate",
        "president:agents!jury_president_id_fkey(id, nom, post_nom, prenom)",
        "secretaire:agents!jury_secretaire_id_fkey(id, nom, post_nom, prenom)",
        "annee:annees(id, designation)",
      ].join(","),
    )
    .or(`president_id.eq.${agentId},secretaire_id.eq.${agentId}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as JuryWithMembers[];
};
