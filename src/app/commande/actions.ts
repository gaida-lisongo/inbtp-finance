"use server";

import { unstable_rethrow } from "next/navigation";

import {
  confirmCommandePayment,
  createCommandeDraft,
  validateStudentCommandePayment,
  type CommandeCategory,
  type PaymentChannel,
} from "@/lib/utils/supabase/commandes";

type CommandeActionInput = {
  category: CommandeCategory;
  resourceId: string;
  channel: PaymentChannel;
  phone?: string | null;
  description?: string | null;
};

type ConfirmCommandeActionInput = CommandeActionInput & {
  commandeId: string;
};

export async function createCommandeDraftAction(input: CommandeActionInput) {
  try {
    return await createCommandeDraft(input);
  } catch (error) {
    unstable_rethrow(error);
    throw error instanceof Error ? error : new Error("commande_create_failed");
  }
}

export async function confirmCommandePaymentAction(input: ConfirmCommandeActionInput) {
  try {
    return await confirmCommandePayment(input);
  } catch (error) {
    unstable_rethrow(error);
    throw error instanceof Error ? error : new Error("commande_confirm_failed");
  }
}

export async function validateCommandePaymentAccessAction(input: {
  commandeId: string;
  category: CommandeCategory;
  resourceId: string;
}) {
  try {
    return await validateStudentCommandePayment(input);
  } catch (error) {
    unstable_rethrow(error);
    throw error instanceof Error ? error : new Error("commande_validate_failed");
  }
}
