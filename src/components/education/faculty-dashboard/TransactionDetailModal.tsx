"use client";

import { useState } from "react";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import type { FacultyDashboardCommande } from "@/lib/utils/supabase/faculte-dashboard";

import { formatAmount, formatDate } from "./utils";

type PaymentCheckResult = {
  success: boolean;
  provider?: string;
  message?: string;
  error?: string;
  data?: unknown;
};

type TransactionDetailModalProps = {
  transaction: FacultyDashboardCommande | null;
  isOpen: boolean;
  onClose: () => void;
};

export default function TransactionDetailModal({
  transaction,
  isOpen,
  onClose,
}: TransactionDetailModalProps) {
  const [paymentState, setPaymentState] = useState<{
    loading: boolean;
    result: PaymentCheckResult | null;
  }>({
    loading: false,
    result: null,
  });

  const checkPayment = async () => {
    if (!transaction?.orderNumber) {
      setPaymentState({
        loading: false,
        result: {
          success: false,
          error: "Aucun orderNumber disponible pour cette transaction.",
        },
      });
      return;
    }

    setPaymentState({ loading: true, result: null });

    try {
      const response = await fetch(`/api/payment/check?orderNumber=${encodeURIComponent(transaction.orderNumber)}`);
      const result = (await response.json()) as PaymentCheckResult;

      setPaymentState({
        loading: false,
        result,
      });
    } catch (error) {
      setPaymentState({
        loading: false,
        result: {
          success: false,
          error: error instanceof Error ? error.message : "Erreur lors de la vérification de paiement",
        },
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" className="max-w-4xl p-0">
      <div className="rounded-3xl bg-white dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Détail de la transaction</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Vue complète de la commande et vérification du paiement.
          </p>
        </div>

        {transaction ? (
          <div className="space-y-6 px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Étudiant</p>
                <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{transaction.studentName}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{transaction.studentEmail || "Email indisponible"}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Produit</p>
                <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{transaction.product || "Produit académique"}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{transaction.categoryLabel}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-gray-50 px-4 py-4 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Commande</p>
                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{transaction.orderNumber || transaction.id}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-4 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Date</p>
                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{formatDate(transaction.created_at)}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-4 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Montant</p>
                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{formatAmount(transaction.total)}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-4 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Statut</p>
                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{transaction.status || "Sans statut"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Description</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
                {transaction.description || "Aucune description"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={checkPayment} disabled={paymentState.loading}>
                {paymentState.loading ? "Vérification..." : "Vérifier le paiement"}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
            </div>

            {paymentState.result ? (
              <div className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Résultat PaymentService</p>
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  {paymentState.result.message || paymentState.result.error || "Aucune réponse lisible"}
                </p>
                <pre className="mt-3 overflow-x-auto rounded-xl bg-gray-50 p-4 text-xs text-gray-700 dark:bg-white/5 dark:text-gray-300">
                  {JSON.stringify(paymentState.result.data ?? paymentState.result, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
