"use server";

import { revalidatePath } from "next/cache";

import {
  createStudentsFromCsv,
  deleteStudent,
  getStudents,
  saveStudent,
} from "@/lib/utils/supabase/students";
import type { StudentRecord, StudentSaveInput } from "@/lib/utils/supabase/students-shared";

export async function getStudentsAction(): Promise<StudentRecord[]> {
  return getStudents();
}

export async function saveStudentAction(input: StudentSaveInput) {
  const student = await saveStudent(input);
  revalidatePath("/etudiants");
  return student;
}

export async function deleteStudentAction(id: string) {
  await deleteStudent(id);
  revalidatePath("/etudiants");
}

export async function importStudentsFromCsvAction(csvContent: string) {
  const result = await createStudentsFromCsv(csvContent);
  revalidatePath("/etudiants");
  return result;
}
