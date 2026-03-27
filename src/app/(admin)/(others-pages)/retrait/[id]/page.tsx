import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { rejectRetraitAction, validateRetraitAction } from "@/app/(admin)/(others-pages)/retrait/[id]/actions";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getAnnees } from "@/lib/utils/supabase/annees";
import { getProgrammes } from "@/lib/utils/supabase/programmes";
import { getRetraitReviewDetails } from "@/lib/utils/supabase/retraits";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export const metadata: Metadata = {
  title: "Detail Retrait | Dashboard Agents",
  description: "Consultation d'un retrait et point d'entree pour sa validation.",
};

type RetraitDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

const amountFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeStyle: "short",
});

const getFeedbackMessage = (status?: string, message?: string) => {
  if (status === "success" && message === "retrait_validated") {
    return "Le retrait a ete valide et le demandeur a ete notifie par email.";
  }

  if (status === "success" && message === "retrait_rejected_for_balance") {
    return "Le retrait a ete invalide automatiquement car le solde de la section est insuffisant.";
  }

  if (status === "success" && message === "retrait_rejected") {
    return "Le retrait a ete invalide et le demandeur a ete notifie.";
  }

  if (status === "error" && message === "retrait_owner_cannot_access_review") {
    return "Le demandeur du retrait n'a pas acces a cette page.";
  }

  if (status === "error" && message === "only_pending_retrait_can_be_processed") {
    return "Seuls les retraits pending peuvent etre traites depuis cette page.";
  }

  if (status === "error" && message === "retrait_requester_email_missing") {
    return "Le demandeur n'a pas d'adresse email exploitable pour la notification.";
  }

  if (status === "error" && message === "order_number_required") {
    return "Le numero de retrait est obligatoire pour valider la demande.";
  }

  if (status === "error" && message) {
    return message;
  }

  return null;
};

export default async function RetraitDetailPage({ params, searchParams }: RetraitDetailPageProps) {
  const [{ id }, currentUser, queryParams] = await Promise.all([params, getAuthenticatedUser(), searchParams]);

  if (!currentUser || !currentUser.canAccessAdmin || !currentUser.agentId) {
    redirect("/signin?error=access_denied");
  }

  const [reviewDetails, programmes, annees] = await Promise.all([getRetraitReviewDetails(id), getProgrammes(), getAnnees()]);

  if (!reviewDetails) {
    notFound();
  }

  if (reviewDetails.retrait.agent_id === currentUser.agentId) {
    redirect(`/cs?status=error&message=retrait_owner_cannot_access_review&annee=${reviewDetails.retrait.annee_id ?? ""}&promotion=${reviewDetails.retrait.pgrogramme_id ?? ""}`);
  }

  const programme = programmes.find((item) => item.id === reviewDetails.retrait.pgrogramme_id) ?? null;
  const annee = annees.find((item) => item.id === reviewDetails.retrait.annee_id) ?? null;
  const feedbackMessage = getFeedbackMessage(queryParams.status, queryParams.message);
  const retraitStatus = reviewDetails.retrait.status?.toLowerCase() ?? "brouillon";
  const canValidate = retraitStatus === "pending" && reviewDetails.sectionFinancialSituation.isReliable;
  const canReject = retraitStatus === "pending";

  return (
    <div>
      <PageBreadcrumb pageTitle={`Retrait - ${reviewDetails.retrait.designation || reviewDetails.retrait.id}`} />

      <div className="space-y-6">
        {queryParams.status === "success" && feedbackMessage ? (
          <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
            {feedbackMessage}
          </div>
        ) : null}

        {queryParams.status === "error" && feedbackMessage ? (
          <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
            {feedbackMessage}
          </div>
        ) : null}

        <ComponentCard
          title={reviewDetails.retrait.designation || "Retrait"}
          desc="Le demandeur ne peut pas acceder a cette page. Elle est reservee au circuit de validation du retrait."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Statut</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">{reviewDetails.retrait.status || "Brouillon"}</p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Montant</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {amountFormatter.format(reviewDetails.retrait.montant ?? 0)}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Order number</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {reviewDetails.retrait.orderNumber || "Non encore attribue"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Demandeur</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {reviewDetails.requester?.displayName || "Agent introuvable"}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{reviewDetails.requester?.email || "Email indisponible"}</p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Promotion</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {programme?.designation || "Promotion non trouvee"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Annee</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {annee?.designation || "Annee non trouvee"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Cree le</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                {dateFormatter.format(new Date(reviewDetails.retrait.created_at))}
              </p>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Situation de recettes"
          desc="Le retrait ne peut etre valide que si la tresorerie de la section couvre le montant demande."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Commandes success</p>
              <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                {amountFormatter.format(reviewDetails.sectionFinancialSituation.totalCommandesSuccess)}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Retraits success</p>
              <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                {amountFormatter.format(reviewDetails.sectionFinancialSituation.totalRetraitsSuccess)}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Solde disponible</p>
              <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                {amountFormatter.format(reviewDetails.sectionFinancialSituation.availableBalance)}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Recettes reliees</p>
              <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                {reviewDetails.sectionFinancialSituation.linkedRevenueCount}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Le retrait demande {amountFormatter.format(reviewDetails.retrait.montant ?? 0)}.
              {reviewDetails.sectionFinancialSituation.isReliable
                ? reviewDetails.sectionFinancialSituation.availableBalance >= (reviewDetails.retrait.montant ?? 0)
                  ? " Le solde actuel permet une validation."
                  : " Le solde actuel ne permet pas de supporter cette demande."
                : " Le calcul n'est pas assez fiable pour autoriser une validation automatique."}
            </p>
          </div>

          {reviewDetails.sectionFinancialSituation.warning ? (
            <div className="rounded-2xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300">
              {reviewDetails.sectionFinancialSituation.warning}
            </div>
          ) : null}

          <div className="max-w-md">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="orderNumber">
              Order number
            </label>
            <input
              id="orderNumber"
              name="orderNumber"
              form="validate-retrait-form"
              defaultValue={reviewDetails.retrait.orderNumber ?? ""}
              placeholder="Saisir le numero de retrait"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              disabled={!canValidate}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Ce numero est saisi manuellement par le validateur au moment de la validation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form id="validate-retrait-form" action={validateRetraitAction}>
              <input type="hidden" name="id" value={reviewDetails.retrait.id} />
              <button
                type="submit"
                disabled={!canValidate}
                className="rounded-lg bg-success-600 px-5 py-3 text-sm font-medium text-white hover:bg-success-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Valider
              </button>
            </form>

            <form action={rejectRetraitAction}>
              <input type="hidden" name="id" value={reviewDetails.retrait.id} />
              <button
                type="submit"
                disabled={!canReject}
                className="rounded-lg bg-error-500 px-5 py-3 text-sm font-medium text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Invalider
              </button>
            </form>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
