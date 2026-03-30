"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import {
  deleteResearchRecord,
  notifyStudentsForResearchRecord,
  saveResearchRecord,
} from "@/lib/utils/supabase/recherche";
import type { ResearchTableName } from "@/lib/utils/supabase/recherche-shared";

const getEntityTab = (value: FormDataEntryValue | null): ResearchTableName => {
  if (value === "stages" || value === "sujets" || value === "laboratoires") {
    return value;
  }
  throw new Error("Invalid entity tab");
};

export async function saveResearchRecordAction(formData: FormData) {
  try {
    const tab = getEntityTab(formData.get("tab"));
    const record = await saveResearchRecord(tab, formData);

    revalidatePath("/cr");
    return { success: true, data: record };
  } catch (error) {
    unstable_rethrow(error);
  }
}

export async function deleteResearchRecordAction(formData: FormData) {
  try {
    const tab = getEntityTab(formData.get("tab"));
    const id = formData.get("id");

    if (!id || typeof id !== "string") {
      throw new Error("Invalid id");
    }

    await deleteResearchRecord(tab, id);

    revalidatePath("/cr");
    return { success: true };
  } catch (error) {
    unstable_rethrow(error);
  }
}

export async function notifyResearchRecordAction(formData: FormData) {
  try {
    const tab = getEntityTab(formData.get("tab"));
    const recordId = formData.get("record_id");
    const programmeId = formData.get("programme_id");

    if (!recordId || typeof recordId !== "string") {
      throw new Error("Invalid recordId");
    }

    if (!programmeId || typeof programmeId !== "string") {
      throw new Error("Invalid programmeId");
    }

    await notifyStudentsForResearchRecord(tab, recordId, programmeId);

    revalidatePath("/cr");
    return { success: true };
  } catch (error) {
    unstable_rethrow(error);
  }
}
