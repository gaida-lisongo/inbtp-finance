"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

type EtudiantFieldErrors = Partial<Record<"nom" | "matricule" | "sexe", string>>;

export type EtudiantActionResult = {
  ok: boolean;
  message: string;
  errors?: EtudiantFieldErrors;
};

export type EtudiantBulkInput = {
  nom: string;
  matricule: string;
  sexe: string;
};

export type EtudiantBulkInsertResult = {
  ok: boolean;
  message: string;
  insertedCount: number;
};

const EMAIL_DOMAIN = "inbtp.ac.cd";

const normalizeValue = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const normalizeCsvValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeMatricule = (value: string) => value.replace(/\s+/g, "");

const removeDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const buildStudentEmail = (nom: string, matricule: string) => {
  const normalizedName = removeDiacritics(nom)
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .trim();

  const nameParts = normalizedName.split(/\s+/).filter(Boolean);
  const firstInitial = nameParts[0]?.charAt(0) ?? "x";
  const sanitizedMatricule = normalizeMatricule(matricule).toLowerCase();

  return `${firstInitial}.${sanitizedMatricule}@${EMAIL_DOMAIN}`;
};

const getReadableDatabaseError = (message: string) => {
  if (message.includes("row-level security policy")) {
    return "Operation refusee par les regles de securite Supabase sur la table etudiants.";
  }

  return message;
};

const validateEtudiantPayload = ({
  nom,
  matricule,
  sexe,
}: {
  nom: string;
  matricule: string;
  sexe: string;
}) => {
  const errors: EtudiantFieldErrors = {};

  if (!nom) {
    errors.nom = "Le nom est obligatoire.";
  }

  if (!matricule) {
    errors.matricule = "Le matricule est obligatoire.";
  }

  if (!sexe) {
    errors.sexe = "Le sexe est obligatoire.";
  }

  return errors;
};

const getSupabase = async () => {
  const cookieStore = await cookies();
  return createServerSupabaseClient(cookieStore);
};

const revalidateEtudiantsPage = () => {
  revalidatePath("/etudiants");
};

export async function saveEtudiantAction(formData: FormData): Promise<EtudiantActionResult> {
  const id = normalizeValue(formData.get("id"));
  const nom = normalizeValue(formData.get("nom"));
  const matricule = normalizeMatricule(normalizeValue(formData.get("matricule")));
  const sexe = normalizeValue(formData.get("sexe"));

  const errors = validateEtudiantPayload({ nom, matricule, sexe });

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "Le formulaire contient des erreurs.",
      errors,
    };
  }

  const payload = {
    nom,
    matricule,
    sexe,
    email: buildStudentEmail(nom, matricule),
  };

  const supabase = await getSupabase();
  const query = id
    ? supabase.from("etudiants").update(payload).eq("id", id)
    : supabase.from("etudiants").insert(payload);

  const { error } = await query;

  if (error) {
    return {
      ok: false,
      message: getReadableDatabaseError(error.message),
    };
  }

  revalidateEtudiantsPage();

  return {
    ok: true,
    message: id ? "L'etudiant a ete mis a jour." : "L'etudiant a ete cree.",
  };
}

export async function deleteEtudiantAction(id: string): Promise<EtudiantActionResult> {
  if (!id) {
    return {
      ok: false,
      message: "Identifiant de l'etudiant manquant.",
    };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.from("etudiants").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: getReadableDatabaseError(error.message),
    };
  }

  revalidateEtudiantsPage();

  return {
    ok: true,
    message: "L'etudiant a ete supprime.",
  };
}

export async function bulkInsertEtudiantsAction(
  rows: EtudiantBulkInput[],
): Promise<EtudiantBulkInsertResult> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      ok: false,
      message: "Aucune ligne a inserer.",
      insertedCount: 0,
    };
  }

  const payload = rows.map((row) => {
    const nom = normalizeCsvValue(row.nom);
    const matricule = normalizeMatricule(normalizeCsvValue(row.matricule));
    const sexe = normalizeCsvValue(row.sexe);

    return {
      nom,
      matricule,
      sexe,
      email: buildStudentEmail(nom, matricule),
    };
  });

  const invalidRow = payload.find((row) => !row.nom || !row.matricule || !row.sexe);

  if (invalidRow) {
    return {
      ok: false,
      message: "Certaines lignes du lot sont invalides.",
      insertedCount: 0,
    };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.from("etudiants").insert(payload);

  if (error) {
    return {
      ok: false,
      message: getReadableDatabaseError(error.message),
      insertedCount: 0,
    };
  }

  revalidateEtudiantsPage();

  return {
    ok: true,
    message: `${payload.length} etudiant(s) ajoute(s).`,
    insertedCount: payload.length,
  };
}

export { buildStudentEmail, normalizeMatricule };
