"use server";

import { revalidatePath } from "next/cache";

import {
  createTeacherRetraitActivity,
  deleteTeacherRetraitActivity,
  getTeacherRetraitActivities,
  getTeacherRetraitsActivity,
  updateTeacherRetraitActivity,
  type TeacherRetraitActivityRecord,
  type TeacherRetraitActivitySaveInput,
  type TeacherRetraitActivityOption,
} from "@/lib/utils/supabase/teacher-retraits";

export const getTeacherRetraitActivitiesAction = async (): Promise<TeacherRetraitActivityOption[]> => {
  return getTeacherRetraitActivities();
};

export const getTeacherRetraitsActivityAction = async (): Promise<TeacherRetraitActivityRecord[]> => {
  return getTeacherRetraitsActivity();
};

export const createTeacherRetraitActivityAction = async (input: TeacherRetraitActivitySaveInput) => {
  const payload = await createTeacherRetraitActivity(input);
  revalidatePath("/enseignant/retraits");
  return payload;
};

export const updateTeacherRetraitActivityAction = async (
  retraitId: string,
  input: TeacherRetraitActivitySaveInput,
) => {
  await updateTeacherRetraitActivity(retraitId, input);
  revalidatePath("/enseignant/retraits");
};

export const deleteTeacherRetraitActivityAction = async (retraitId: string) => {
  await deleteTeacherRetraitActivity(retraitId);
  revalidatePath("/enseignant/retraits");
};
