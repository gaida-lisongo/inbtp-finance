import { getCurrentAgentAccess } from "@/lib/utils/supabase/agents";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { type StudentRecord, type StudentSaveInput } from "@/lib/utils/supabase/students-shared";

const emptyToNull = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const normalizeEmail = (value: string | null | undefined) => {
  const normalizedValue = emptyToNull(value);
  return normalizedValue ? normalizedValue.toLowerCase() : null;
};

const assertCanManageStudents = async () => {
  const access = await getCurrentAgentAccess();

  if (!access.canManageStudents) {
    throw new Error("access_denied");
  }
};

const normalizeStudentEmail = (email: string) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("student_email_required");
  }

  return normalizedEmail;
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue.trim());
  return values;
};

export const getStudents = async () => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("students")
    .select("*")
    .order("prenom", { ascending: true })
    .order("post_nom", { ascending: true })
    .order("nom", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as StudentRecord[];
};

export const getStudentById = async (id: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("students").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return data as StudentRecord;
};

export const saveStudent = async (input: StudentSaveInput) => {
  await assertCanManageStudents();

  const nom = emptyToNull(input.nom);
  const postNom = emptyToNull(input.post_nom);
  const prenom = emptyToNull(input.prenom);
  const grade = emptyToNull(input.grade);

  if (!nom || !postNom || !prenom || !grade) {
    throw new Error("Tous les champs nom, post_nom, prenom et grade sont obligatoires.");
  }

  const email = normalizeStudentEmail(input.email);
  const payload = {
    nom,
    post_nom: postNom,
    prenom,
    grade,
    email,
    user_id: null,
  };

  const admin = createAdminClient();

  if (input.id) {
    const { data, error } = await admin.from("students").update(payload).eq("id", input.id).select("*").single();

    if (error) {
      throw new Error(error.message);
    }

    return data as StudentRecord;
  }

  const { data, error } = await admin.from("students").insert(payload).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return data as StudentRecord;
};

export const createStudentsFromCsv = async (csvContent: string) => {
  await assertCanManageStudents();

  const trimmedContent = csvContent.trim();

  if (!trimmedContent) {
    throw new Error("Le contenu CSV est vide.");
  }

  const lines = trimmedContent.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("Le CSV doit contenir un en-tete et au moins une ligne.");
  }

  const header = parseCsvLine(lines[0]).map((item) => item.toLowerCase());
  const expectedHeader = ["nom", "post_nom", "prenom", "grade", "email"];

  if (expectedHeader.some((column, index) => header[index] !== column)) {
    throw new Error("En-tete CSV invalide. Utilisez le template fourni.");
  }

  const rows = lines.slice(1).map((line, rowIndex) => {
    const [nom, postNom, prenom, grade, email] = parseCsvLine(line);
    const normalizedEmail = normalizeStudentEmail(email);

    if (!nom || !postNom || !prenom || !grade) {
      throw new Error(`Ligne ${rowIndex + 2}: toutes les colonnes sont obligatoires.`);
    }

    return {
      nom,
      post_nom: postNom,
      prenom,
      grade,
      email: normalizedEmail,
      user_id: null,
    };
  });

  const admin = createAdminClient();
  const { error } = await admin.from("students").insert(rows);

  if (error) {
    throw new Error(error.message);
  }

  const students = await getStudents();
  return {
    importedCount: rows.length,
    students,
  };
};

export const deleteStudent = async (id: string) => {
  await assertCanManageStudents();

  const admin = createAdminClient();
  const { error } = await admin.from("students").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};
