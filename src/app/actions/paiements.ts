"use server";

import { revalidatePath } from "next/cache";

import { getPaiementsForSecretaryProgramme, validatePaiementManually } from "@/lib/utils/supabase/paiements";

export async function getPaiementsAction(programmeId: string) {
  try {
    return await getPaiementsForSecretaryProgramme(programmeId);
  } catch (error) {
    console.error("Error fetching paiements:", error);
    throw error instanceof Error ? error : new Error("paiements_fetch_failed");
  }
}

export async function validatePaiementAction(programmeId: string, paiementId: string) {
  try {
    const result = await validatePaiementManually(programmeId, paiementId);
    revalidatePath("/sec");
    return result;
  } catch (error) {
    console.error("Error validating paiement:", error);
    throw error instanceof Error ? error : new Error("paiement_validate_failed");
  }
}
