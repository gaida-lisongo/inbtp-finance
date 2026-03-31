"use server";

import { unstable_rethrow } from "next/navigation";

import { confirmActivityCommandePayment, createActivityCommandeDraft } from "@/lib/utils/supabase/student-course";
import type { PaymentChannel } from "@/lib/utils/supabase/commandes";

type ActivityCommandeActionInput = {
  activityId: string;
  channel: PaymentChannel;
  phone?: string | null;
  description?: string | null;
};

type ConfirmActivityCommandeActionInput = ActivityCommandeActionInput & {
  commandeId: string;
};

export async function createActivityCommandeDraftAction(input: ActivityCommandeActionInput) {
  try {
    return await createActivityCommandeDraft(input);
  } catch (error) {
    unstable_rethrow(error);
    throw error instanceof Error ? error : new Error("activity_commande_create_failed");
  }
}

export async function confirmActivityCommandePaymentAction(input: ConfirmActivityCommandeActionInput) {
  try {
    return await confirmActivityCommandePayment(input);
  } catch (error) {
    unstable_rethrow(error);
    throw error instanceof Error ? error : new Error("activity_commande_confirm_failed");
  }
}
