"use client";

import { type FormEvent, useState, useTransition } from "react";

import { confirmActivityCommandePaymentAction, createActivityCommandeDraftAction } from "@/app/(admin)/(student)/cours/actions";
import Button from "@/components/ui/button/Button";
import type { CommandeRecord, PaymentChannel } from "@/lib/utils/supabase/commandes";
import type { ActivityRecord } from "@/lib/utils/supabase/student-course";

type StudentSummary = {
  email: string | null;
  telephone: string | null;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
};

type ActivityCheckoutFlowProps = {
  activity: ActivityRecord;
  student: StudentSummary;
  onSuccess?: (orderNumber: string) => void;
};

const paymentLabels: Record<PaymentChannel, string> = {
  MOBILE_MONEY: "Mobile Money",
  CREDIT_CARD: "Carte bancaire",
};

const formatCurrency = (amount: number | null) => (typeof amount === "number" ? `${amount.toLocaleString("fr-FR")} USD` : "Montant indisponible");

const getStudentDisplayName = (student: StudentSummary) =>
  [student.prenom, student.post_nom, student.nom].filter(Boolean).join(" ").trim() || "Etudiant";

const getErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Une erreur est survenue pendant le traitement de la commande.";
  }

  switch (error.message) {
    case "phone_required":
      return "Le numéro de téléphone est requis pour un paiement Mobile Money.";
    case "commande_already_paid":
      return "Cette activité a déjà été réglée pour votre compte.";
    case "activity_amount_invalid":
      return "Le montant de cette activité n'est pas configuré correctement.";
    default:
      return error.message;
  }
};

export default function ActivityCheckoutFlow({ activity, student, onSuccess }: ActivityCheckoutFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [channel, setChannel] = useState<PaymentChannel>("MOBILE_MONEY");
  const [phone, setPhone] = useState(student.telephone ?? "");
  const [description, setDescription] = useState("");
  const [commande, setCommande] = useState<CommandeRecord | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStepTwoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const draft = await createActivityCommandeDraftAction({
          activityId: activity.id,
          channel,
          phone,
          description,
        });

        setCommande(draft.commande);
        setStep(3);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    });
  };

  const handleConfirm = () => {
    if (!commande) {
      return;
    }

    setErrorMessage(null);
    setServerMessage(null);

    startTransition(async () => {
      try {
        const result = await confirmActivityCommandePaymentAction({
          commandeId: commande.id,
          activityId: activity.id,
          channel,
          phone,
          description,
        });

        setCommande(result.commande);
        setServerMessage(result.message);
        onSuccess?.(result.orderNumber);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {[1, 2, 3].map((value) => (
          <div key={value} className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${
                step >= value ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400"
              }`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {step === 1 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(["MOBILE_MONEY", "CREDIT_CARD"] as PaymentChannel[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setChannel(value);
                setStep(2);
              }}
              className="rounded-2xl border border-gray-200 px-5 py-6 text-left transition hover:border-brand-400 hover:bg-brand-50/40 dark:border-gray-800 dark:hover:bg-brand-500/5"
            >
              <div className="text-base font-semibold text-gray-800 dark:text-white/90">{paymentLabels[value]}</div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {value === "MOBILE_MONEY" ? "Paiement par numéro de téléphone." : "Paiement par carte bancaire."}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <form onSubmit={handleStepTwoSubmit} className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="font-medium text-gray-900 dark:text-white/90">{activity.designation || "Activité"}</div>
            <div className="mt-1 text-gray-500 dark:text-gray-400">{formatCurrency(activity.montant)}</div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Etudiant</label>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900">
              {getStudentDisplayName(student)}
            </div>
          </div>

          {channel === "MOBILE_MONEY" ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Numéro de téléphone</label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+243..."
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Description facultative"
              />
            </div>
          )}

          {errorMessage ? (
            <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Retour
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Validation..." : "Valider"}
            </Button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500 dark:text-gray-400">Commande</span>
              <span className="font-medium text-gray-900 dark:text-white/90">{commande?.id}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-gray-500 dark:text-gray-400">Canal</span>
              <span className="font-medium text-gray-900 dark:text-white/90">{paymentLabels[channel]}</span>
            </div>
          </div>

          {serverMessage ? (
            <div className="rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
              {serverMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={isPending}>
              Modifier
            </Button>
            {!serverMessage ? (
              <Button onClick={handleConfirm} disabled={isPending || !commande}>
                {isPending ? "Paiement..." : "Confirmer la commande"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
