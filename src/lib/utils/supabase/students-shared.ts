export type StudentRecord = {
  id: string;
  user_id: string | null;
  grade: string | null;
  photo: string | null;
  role: string | null;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  telephone: string | null;
  bio: string | null;
  facebook: string | null;
  x: string | null;
  twitter: string | null;
  pays: string | null;
  ville: string | null;
  adresse: string | null;
  commune: string | null;
  created_at: string;
  entra_id: string | null;
  email: string | null;
};

export type StudentSaveInput = {
  id?: string | null;
  nom: string;
  post_nom: string;
  prenom: string;
  grade: string;
  email: string;
};

export const getStudentDisplayName = (student: Pick<StudentRecord, "prenom" | "post_nom" | "nom">) => {
  const fullName = [student.prenom, student.post_nom, student.nom].filter(Boolean).join(" ").trim();
  return fullName || "Etudiant sans nom";
};
