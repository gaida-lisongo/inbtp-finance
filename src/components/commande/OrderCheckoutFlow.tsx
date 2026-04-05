"use client";

import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";

import {
  confirmCommandePaymentAction,
  createCommandeDraftAction,
  validateCommandePaymentAccessAction,
} from "@/app/commande/actions";
import Button from "@/components/ui/button/Button";
import type { CommandeCategory, CommandeRecord, CommandeResourceSummary, PaymentChannel } from "@/lib/utils/supabase/commandes";

type StudentSummary = {
  id: string;
  email: string | null;
  telephone: string | null;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
};

type OrderCheckoutFlowProps = {
  category: CommandeCategory;
  resource: CommandeResourceSummary;
  student: StudentSummary;
};

const paymentLabels: Record<PaymentChannel, string> = {
  MOBILE_MONEY: "Mobile Money",
  CREDIT_CARD: "Carte bancaire",
};

const getStudentDisplayName = (student: Pick<StudentSummary, "prenom" | "post_nom" | "nom">) =>
  [student.prenom, student.post_nom, student.nom].filter(Boolean).join(" ").trim() || "Etudiant";

const formatCurrency = (amount: number | null) => {
  if (typeof amount !== "number") {
    return "Montant indisponible";
  }

  return `${amount.toLocaleString("fr-FR")} USD`;
};

const getErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Une erreur est survenue pendant le traitement de la commande.";
  }

  switch (error.message) {
    case "phone_required":
      return "Le numero de telephone est requis pour un paiement Mobile Money.";
    case "commande_already_paid":
      return "Cette ressource a deja ete reglee pour votre compte.";
    case "resource_amount_invalid":
      return "Le montant de cette ressource n'est pas configure correctement.";
    case "auth_required":
      return "Vous devez etre connecte pour poursuivre cette commande.";
    case "resource_access_denied":
      return "Cette ressource n'est pas accessible avec votre compte etudiant.";
    case "commande_not_found":
      return "La commande est introuvable pour votre compte.";
    default:
      return error.message;
  }
};

export default function OrderCheckoutFlow({ category, resource, student }: OrderCheckoutFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [channel, setChannel] = useState<PaymentChannel>("MOBILE_MONEY");
  const [phone, setPhone] = useState(student.telephone ?? "");
  const [description, setDescription] = useState("");
  const [commande, setCommande] = useState<CommandeRecord | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessPath, setAccessPath] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<{
    reference: string;
    amount: number;
    currency: string;
    channel: PaymentChannel;
    resourceLabel: string;
    orderNumber: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePaymentTypeSelection = (selectedChannel: PaymentChannel) => {
    if (isPending) {
      return;
    }

    setChannel(selectedChannel);
    setErrorMessage(null);
    setServerMessage(null);
    setStep(2);
  };

  const handleStepTwoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setServerMessage(null);

    startTransition(async () => {
      try {
        const draft = await createCommandeDraftAction({
          category,
          resourceId: resource.id,
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
        const result = await confirmCommandePaymentAction({
          commandeId: commande.id,
          category,
          resourceId: resource.id,
          channel,
          phone,
          description,
        });

        setCommande(result.commande);
        setServerMessage(result.message);
        setAccessPath(null);
        setInvoiceData({
          reference: result.commande.id,
          amount: result.commande.total ?? 0,
          currency: "USD",
          channel,
          resourceLabel: resource.title,
          orderNumber: result.orderNumber,
        });
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    });
  };

  const handleValidatePaymentAccess = () => {
    if (!commande) {
      return;
    }

    setErrorMessage(null);
    setServerMessage(null);

    startTransition(async () => {
      try {
        const result = await validateCommandePaymentAccessAction({
          commandeId: commande.id,
          category,
          resourceId: resource.id,
        });

        setCommande(result.commande);
        setServerMessage(result.message);
        setAccessPath(result.success ? result.productPath : null);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-3">
          {[1, 2, 3].map((value) => {
            const isActive = step === value;
            const isCompleted = step > value;

            return (
              <div key={value} className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${
                    isActive || isCompleted
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  {value}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {value === 1 ? "Type de paiement" : value === 2 ? "Informations de paiement" : "Confirmation"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {step === 1 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Choisissez votre type de paiement</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Selectionnez le canal de paiement a utiliser pour cette commande.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {(["MOBILE_MONEY", "CREDIT_CARD"] as PaymentChannel[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handlePaymentTypeSelection(value)}
                    className="rounded-2xl border border-gray-200 px-5 py-6 text-left transition hover:border-brand-400 hover:bg-brand-50/40 dark:border-gray-800 dark:hover:bg-brand-500/5"
                  >
                    <div className="text-base font-semibold text-gray-800 dark:text-white/90">{paymentLabels[value]}</div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {value === "MOBILE_MONEY"
                        ? "Paiement depuis un numero de telephone compatible Mobile Money."
                        : "Paiement par carte bancaire avec confirmation de commande."}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <form
              onSubmit={handleStepTwoSubmit}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Informations de paiement</h2>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Une commande sera enregistree avant l&apos;envoi de la demande de paiement.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setStep(1)} type="button">
                  Retour
                </Button>
              </div>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Canal choisi</label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    {paymentLabels[channel]}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Etudiant</label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    {getStudentDisplayName(student)}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Adresse email</label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    {student.email ?? "Aucune adresse email"}
                  </div>
                </div>

                {channel === "MOBILE_MONEY" ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="commande-phone">
                      Numero de telephone
                    </label>
                    <input
                      id="commande-phone"
                      name="phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+243..."
                      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="commande-description">
                      Description de paiement
                    </label>
                    <textarea
                      id="commande-description"
                      name="description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={4}
                      placeholder="Description optionnelle visible dans la commande."
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                )}

                {errorMessage ? (
                  <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                    {errorMessage}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Validation..." : "Valider les informations"}
                  </Button>
                </div>
              </div>
            </form>
          ) : null}

          {step === 3 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Confirmation de la commande</h2>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    La commande a ete preparee. Vous pouvez maintenant lancer la collecte du paiement.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setStep(2)} type="button" disabled={isPending}>
                  Modifier
                </Button>
              </div>

              <div className="mt-6 grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">Commande</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{commande?.id}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">Canal</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{paymentLabels[channel]}</span>
                </div>
                {channel === "MOBILE_MONEY" ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Telephone</span>
                    <span className="font-medium text-gray-800 dark:text-white/90">{phone || "Non renseigne"}</span>
                  </div>
                ) : null}
              </div>

              {serverMessage ? (
                <div className="mt-5 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
                  {serverMessage}
                </div>
              ) : null}

              {invoiceData ? (
                <div className="mt-5 space-y-3 rounded-xl border border-gray-200 bg-white/70 p-4 text-sm dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="font-semibold text-gray-800 dark:text-white/90">Résumé</div>
                  <div className="grid gap-2 text-gray-700 dark:text-gray-200">
                    <div>Montant : {formatCurrency(invoiceData.amount)}</div>
                    <div>Canal : {paymentLabels[invoiceData.channel]}</div>
                    <div>OrderNumber : {invoiceData.orderNumber}</div>
                    <div>Ressource : {invoiceData.resourceLabel}</div>
                  </div>
                </div>
              ) : null}

              {errorMessage ? (
                <div className="mt-5 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                  {errorMessage}
                </div>
              ) : null}

              <div className="mt-6 flex justify-end">
                {!invoiceData ? (
                  <Button onClick={handleConfirm} disabled={isPending || !commande}>
                    {isPending ? "Confirmation..." : "Confirmer la commande"}
                  </Button>
                ) : !accessPath ? (
                  <Button onClick={handleValidatePaymentAccess} disabled={isPending || !commande}>
                    {isPending ? "Verification..." : "Verifier le paiement dans l'application"}
                  </Button>
                ) : null}
              </div>

              {accessPath ? (
                <div className="mt-4 flex justify-end">
                  <Link
                    href={accessPath}
                    className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
                  >
                    Acceder a la ressource
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] min-h-[220px]">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Resume de la ressource</h2>
              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Ressource</div>
                  <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{resource.title}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Categorie</div>
                  <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{category}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Montant</div>
                  <div className="mt-1 text-lg font-semibold text-brand-600">{formatCurrency(resource.amount)}</div>
                </div>
                {resource.description ? (
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Description</div>
                    <div className="mt-1 max-h-32 overflow-hidden whitespace-pre-line break-words text-gray-700 dark:text-gray-300">
                      {resource.description}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Etudiant</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Nom complet</div>
                <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{getStudentDisplayName(student)}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Email</div>
                <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{student.email ?? "Non renseigne"}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Telephone</div>
                <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{student.telephone ?? "Non renseigne"}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
