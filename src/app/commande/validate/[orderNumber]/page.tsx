import Link from "next/link";

import { PaymentService } from "@/lib/services/PaymentService";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getCommandePath, getProductPath, type CommandeCategory } from "@/lib/utils/supabase/commandes";

type ValidationPageProps = {
  params: Promise<{
    orderNumber: string;
  }>;
};

type PaymentResponseSummary = {
  provider: string | null;
  message: string | null;
  channel: string | null;
  amount: string | null;
  amountCustomer: string | null;
  currency: string | null;
  createdAt: string | null;
  transactionStatus: string | null;
  reference: string | null;
};

const getNestedRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
};

const getStringValue = (record: Record<string, unknown> | null, key: string) => {
  const value = record?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const getPaymentResponseSummary = (paymentResponse: unknown): PaymentResponseSummary | null => {
  const root = getNestedRecord(paymentResponse);

  if (!root) {
    return null;
  }

  const nestedData = getNestedRecord(root.data);
  const innerPayload = getNestedRecord(nestedData?.data);
  const transaction = getNestedRecord(innerPayload?.transaction);

  return {
    provider: getStringValue(root, "provider") ?? getStringValue(nestedData, "provider"),
    message: getStringValue(root, "message") ?? getStringValue(nestedData, "message") ?? getStringValue(innerPayload, "message"),
    channel: getStringValue(transaction, "channel"),
    amount: getStringValue(transaction, "amount"),
    amountCustomer: getStringValue(transaction, "amountCustomer"),
    currency: getStringValue(transaction, "currency"),
    createdAt: getStringValue(transaction, "createdAt"),
    transactionStatus: getStringValue(transaction, "status"),
    reference: getStringValue(transaction, "reference"),
  };
};

const getStatusBadgeClassName = (success: boolean) =>
  success
    ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
    : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300";

const getStatusCardClassName = (success: boolean) =>
  success
    ? "border-success-200 bg-success-50/60 dark:border-success-500/30 dark:bg-success-500/10"
    : "border-error-200 bg-error-50/60 dark:border-error-500/30 dark:bg-error-500/10";

const getTransactionStatusLabel = (status: string | null) => {
  switch (status) {
    case "0":
      return "Transaction reussie";
    case "1":
      return "Transaction non aboutie";
    default:
      return status ?? "Indetermine";
  }
};

const PaymentStatusDetails = ({
  success,
  commandeStatus,
  paymentResponse,
}: {
  success: boolean;
  commandeStatus?: string;
  paymentResponse?: unknown;
}) => {
  const summary = getPaymentResponseSummary(paymentResponse);

  return (
    <div className={`rounded-2xl border p-6 ${getStatusCardClassName(success)}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClassName(success)}`}>
          Statut enregistre : {commandeStatus ?? "unknown"}
        </span>
        {summary?.provider ? (
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300">
            Fournisseur : {summary.provider}
          </span>
        ) : null}
      </div>

      {summary?.message ? (
        <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white/90">{summary.message}</p>
      ) : null}

      {summary ? (
        <div className="mt-5 grid gap-4 rounded-2xl border border-gray-200 bg-white/80 p-5 text-sm dark:border-gray-800 dark:bg-gray-900/40 sm:grid-cols-2">
          <div>
            <div className="text-gray-500 dark:text-gray-400">Reference</div>
            <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{summary.reference ?? "Non renseignee"}</div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Canal</div>
            <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{summary.channel ?? "Non renseigne"}</div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Montant</div>
            <div className="mt-1 font-medium text-gray-800 dark:text-white/90">
              {summary.amount && summary.currency ? `${summary.amount} ${summary.currency}` : "Non renseigne"}
            </div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Montant client</div>
            <div className="mt-1 font-medium text-gray-800 dark:text-white/90">
              {summary.amountCustomer && summary.currency ? `${summary.amountCustomer} ${summary.currency}` : "Non renseigne"}
            </div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Date transaction</div>
            <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{summary.createdAt ?? "Non renseignee"}</div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Etat transaction</div>
            <div className="mt-1 font-medium text-gray-800 dark:text-white/90">
              {getTransactionStatusLabel(summary.transactionStatus)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
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
    category?: CommandeCategory;
    productId?: string;
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
      category: updatedCommande.categorie as CommandeCategory,
      productId: updatedCommande.product ?? undefined,
    };

    console.log(`Commande ${orderNumber} validation: ${success ? "success" : "no"}`, result.paymentResponse);
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

  const resourcePath =
    result?.category && result.productId
      ? getProductPath(result.category, result.productId)
      : null;

  const commandePath =
    result?.category && result.productId
      ? getCommandePath(result.category, result.productId)
      : null;

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
          <div className="mt-4">
            <PaymentStatusDetails
              success={Boolean(result?.success)}
              commandeStatus={result?.commandeStatus}
              paymentResponse={result?.paymentResponse}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {result?.success && resourcePath ? (
            <Link
              href={resourcePath}
              className="flex-1 min-w-[160px] rounded-lg bg-brand-500 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Acceder a la ressource
            </Link>
          ) : commandePath ? (
            <Link
              href={commandePath}
              className="flex-1 min-w-[160px] rounded-lg bg-brand-500 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Retour a la commande
            </Link>
          ) : null}
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
