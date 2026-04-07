"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { createManualPaiementAction } from "@/app/commande/actions";
import Button from "@/components/ui/button/Button";
import type { CommandeCategory, CommandePageData } from "@/lib/utils/supabase/commandes";

type ManualPaymentFlowProps = {
  category: CommandeCategory;
  resourceId: string;
  data: CommandePageData;
};

const formatAmount = (value: number | null) => {
  if (typeof value !== "number") {
    return "Montant non renseigne";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
};

export default function ManualPaymentFlow({ category, resourceId, data }: ManualPaymentFlowProps) {
  const [result, setResult] = useState<{
    orderNumber: string;
    invoicePath: string;
    message: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await createManualPaiementAction({
          category,
          resourceId,
        });

        setResult({
          orderNumber: response.orderNumber,
          invoicePath: response.invoicePath,
          message: response.message,
        });
      } catch (error) {
        if (error instanceof Error && error.message === "commande_already_paid") {
          setErrorMessage("Cette ressource est deja reglee.");
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Impossible de generer le bon de commande.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="inline-flex rounded-full bg-brand-50 px-4 py-1 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          Paiement manuel
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-gray-900 dark:text-white/90">Generation du bon de commande</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          Cette operation enregistre un paiement <strong>pending</strong> et genere votre invoice (bon de commande) a presenter au bureau.
        </p>

        <div className="mt-6 grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2">
          <div>
            <div className="text-gray-500 dark:text-gray-400">Etudiant</div>
            <div className="mt-1 font-medium text-gray-800 dark:text-white/90">
              {[data.student.prenom, data.student.post_nom, data.student.nom].filter(Boolean).join(" ").trim() || "Etudiant"}
            </div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Montant</div>
            <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{formatAmount(data.resource.amount)}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-gray-500 dark:text-gray-400">Ressource</div>
            <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{data.resource.title}</div>
          </div>
        </div>

        {result ? (
          <div className="mt-5 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
            <div>{result.message}</div>
            <div className="mt-1">OrderNumber: {result.orderNumber}</div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-5 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!result ? (
            <Button onClick={handleGenerate} disabled={isPending}>
              {isPending ? "Generation..." : "Generer le bon de commande"}
            </Button>
          ) : (
            <Link
              href={result.invoicePath}
              target="_blank"
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Ouvrir l&apos;invoice (PDF)
            </Link>
          )}

          <Link
            href={`/commande/${category}/${resourceId}`}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
          >
            Aller a la page commande
          </Link>
        </div>
      </section>
    </div>
  );
}
