import Link from "next/link";
import { redirect } from "next/navigation";

import { updateCommandeStatusAction } from "@/app/(admin)/commandes/[commandeId]/actions";
import {
  getFacultyCommandeDetail,
  type FacultyCommandeDetail,
} from "@/lib/utils/supabase/faculty-commandes";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

type FacultyCommandePageProps = {
  params: Promise<{
    commandeId: string;
  }>;
};

const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const formatAmount = (value: number | null) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(typeof value === "number" ? value : 0);

const categoryLabel = (detail: FacultyCommandeDetail) => {
  switch (detail.commande.categoryKey) {
    case "stages":
      return "Stages";
    case "sujets":
      return "Sujets";
    case "session":
      return "Session";
    case "documents":
      return "Documents";
    case "laboratoire":
      return "Laboratoire";
    default:
      return detail.commande.categorie ?? "Autres";
  }
};

export default async function FacultyCommandeDetailPage({ params }: FacultyCommandePageProps) {
  const { commandeId } = await params;

  let detail: FacultyCommandeDetail | null = null;
  let errorMessage: string | null = null;

  try {
    detail = await getFacultyCommandeDetail(commandeId);
  } catch (error) {
    if (error instanceof Error && error.message === "access_denied") {
      redirect("/signin?error=access_denied");
    }

    errorMessage = error instanceof Error ? error.message : "Erreur de chargement de la commande.";
  }

  if (!detail) {
    return (
      <main className="space-y-6">
        <div className="rounded-2xl border border-error-200 bg-white p-6 dark:border-error-500/30 dark:bg-white/[0.03]">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white/90">Commande introuvable</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{errorMessage ?? "Aucune commande disponible."}</p>
          <Link href="/" className="mt-4 inline-flex rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white">
            Retour dashboard
          </Link>
        </div>
      </main>
    );
  }

  const orderNumber = detail.commande.orderNumber?.trim() || null;

  const documentCategory = detail.resource?.documentCategory?.toLowerCase() ?? "";

  const docCategory = detail.resource?.documentCategory?.toLowerCase() ?? "";

  return (
    <main className="space-y-6">
      <PageBreadcrumb 
        pageRoot="Notifications"
        pageTitle="Commande"
        detailPage={orderNumber ?? detail.commande.id}
        path="/notifications"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500">Etudiant</p>
          <p className="mt-2 font-semibold text-gray-900 dark:text-white/90">{detail.student?.displayName ?? "Indisponible"}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{detail.student?.email ?? "Email indisponible"}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500">Categorie</p>
          <p className="mt-2 font-semibold text-gray-900 dark:text-white/90">{categoryLabel(detail)}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{detail.resource?.title ?? "Ressource"}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500">Statut</p>
          <p className="mt-2 font-semibold text-gray-900 dark:text-white/90">{detail.commande.status ?? "Sans statut"}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Montant {formatAmount(detail.commande.total)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs uppercase text-gray-500">Date commande</p>
          <p className="mt-2 font-semibold text-gray-900 dark:text-white/90">{formatDate(detail.commande.created_at)}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{detail.programme?.designation ?? "Programme non renseigne"}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Actions chef de section</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Ici, le chef de section peut mettre a jour le statut de la commande. L&apos;etudiant ne dispose pas de cette action.
        </p>

        <form action={updateCommandeStatusAction} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="commande_id" value={detail.commande.id} />
          <div>
            <label htmlFor="status" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nouveau statut
            </label>
            <select
              id="status"
              name="status"
              defaultValue={detail.commande.status ?? "pending"}
              className="h-11 min-w-[180px] rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90"
            >
              <option value="pending">pending</option>
              <option value="success">success</option>
              <option value="no">no</option>
            </select>
          </div>
          <button type="submit" className="h-11 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600">
            Mettre a jour
          </button>
        </form>

        {orderNumber ? (
          <div className="mt-4">
            <Link
              href={`/commande/validate/${encodeURIComponent(orderNumber)}`}
              className="inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
            >
              Verifier le paiement FlexPay
            </Link>
          </div>
        ) : null}
      </section>

      {detail.commande.categoryKey === "stages" ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Generation lettre de stage</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Disponible uniquement pour les commandes `success`.
          </p>
          <form
            action={`/api/admin/commandes/${detail.commande.id}/stage-letter`}
            method="post"
            target="_blank"
            className="mt-4 grid gap-4 md:grid-cols-2"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="recipient_name">
                Nom destinataire
              </label>
              <input
                id="recipient_name"
                name="recipient_name"
                required
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="recipient_quality">
                Qualite destinataire
              </label>
              <input
                id="recipient_quality"
                name="recipient_quality"
                required
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="recipient_sex">
                Sexe
              </label>
              <select
                id="recipient_sex"
                name="recipient_sex"
                defaultValue="M"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90"
              >
                <option value="M">Masculin</option>
                <option value="F">Feminin</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="company_name">
                Entreprise
              </label>
              <input
                id="company_name"
                name="company_name"
                required
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="company_location">
                Lieu
              </label>
              <input
                id="company_location"
                name="company_location"
                required
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={detail.commande.status !== "success"}
                className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Generer lettre de stage
              </button>
            </div>
          </form>
        </section>
      ) : docCategory.includes("relev") ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Génération bulletin</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Ce document est un relevé de notes. Il suffit de générer le PDF pour l&apos;étudiant (statut success requis).
          </p>
          <form
            action={`/api/admin/commandes/${detail.commande.id}/releve`}
            method="post"
            target="_blank"
            className="mt-4"
          >
            <button
              type="submit"
              disabled={detail.commande.status !== "success"}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Générer bulletin
            </button>
          </form>
        </section>
      ) : docCategory.includes("validation") ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Génération fiche de validation</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Le document est identifié comme fiche de validation. CLIquez pour générer le PDF officiel.
          </p>
          <form
            action={`/api/admin/commandes/${detail.commande.id}/validation-sheet`}
            method="post"
            target="_blank"
            className="mt-4"
          >
            <button
              type="submit"
              disabled={detail.commande.status !== "success"}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Générer fiche de validation
            </button>
          </form>
        </section>
      ) : (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Ressource metier</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Le workflow metier est prepare pour cette categorie. Vous pouvez deja piloter le statut de commande depuis cette page.
          </p>
        </section>
      )}
    </main>
  );
}
