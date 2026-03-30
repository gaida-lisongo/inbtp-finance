import Link from "next/link";
import { revalidatePath } from "next/cache";

import { PaymentService } from "@/lib/services/PaymentService";
import { createAdminClient } from "@/lib/utils/supabase/admin";

type ValidationPageProps = {
  params: Promise<{
    orderNumber: string;
  }>;
};

const updateCommandeStatus = async (orderNumber: string, status: string) => {
  const admin = createAdminClient();
  const { data: commande, error: commandeError } = await admin
    .from("commande")
    .select("*")
    .eq("orderNumber", orderNumber)
    .maybeSingle();

  if (commandeError) {
    throw new Error(commandeError.message);
  }

  if (!commande) {
    throw new Error("commande_not_found");
  }

  if (commande.status === status) {
    return commande;
  }

  const { data, error } = await admin
    .from("commande")
    .update({ status })
    .eq("id", commande.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export default async function ValidateCommandePage({ params }: ValidationPageProps) {
  const { orderNumber } = await params;

  let result: {
    success: boolean;
    message: string;
    commandeStatus?: string;
    paymentResponse?: unknown;
  } | null = null;

  try {
    const paymentService = PaymentService.getInstance();
    const paymentResponse = await paymentService.check(orderNumber);
    const success = Boolean(paymentResponse.success);
    const desiredStatus = success ? "success" : "no";

    const updatedCommande = await updateCommandeStatus(orderNumber, desiredStatus);
    result = {
      success,
      message: success
        ? "Le paiement a ete confirme par FlexPay."
        : "La transaction n'a pas pu etre confirmee. Le statut de la commande passe en « no ».",
      commandeStatus: updatedCommande.status ?? "unknown",
      paymentResponse,
    };

    console.log(`Commande ${orderNumber} validation: ${success ? "success" : "no"}`, result.paymentResponse);

    revalidatePath("/commande");
  } catch (error) {
    console.error("Validation commande error", orderNumber, error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    result = {
      success: false,
      message,
      commandeStatus: "error",
      paymentResponse: null,
    };
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Validation de commande</p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white/90">Order {orderNumber}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vérification réalisée via le proxy FlexPay. Résultat enregistré dans l’historique des commandes.
          </p>
        </header>

        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200">
          <p className={`font-semibold ${result?.success ? "text-success-700" : "text-error-700"}`}>{result?.message}</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Statut enregistré : {result?.commandeStatus}</p>
          {result?.paymentResponse ? (
            <pre className="mt-4 rounded-lg bg-gray-900/5 p-3 text-xs text-gray-500 dark:bg-gray-900/40 dark:text-gray-300">
              {JSON.stringify(result.paymentResponse, null, 2)}
            </pre>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/commande/documents"
            className="flex-1 min-w-[160px] rounded-lg bg-brand-500 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Retour à la commande
          </Link>
          <a
            href="mailto:support@example.com"
            className="flex-1 min-w-[160px] rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 transition hover:border-gray-400 dark:border-gray-700 dark:text-gray-200"
          >
            Contacter le support
          </a>
        </div>
      </div>
    </main>
  );
}
