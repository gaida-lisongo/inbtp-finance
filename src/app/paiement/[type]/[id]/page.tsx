import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import ManualPaymentFlow from "@/components/paiement/ManualPaymentFlow";
import {
  getCommandeCategoryLabel,
  getCommandeCheckoutPageData,
  getProductPath,
  type CommandeCategory,
} from "@/lib/utils/supabase/commandes";

type ManualPaymentPageProps = {
  params: Promise<{
    type: string;
    id: string;
  }>;
};

const allowedTypes: CommandeCategory[] = ["documents", "session", "stages", "sujets", "laboratoire"];

const getErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Une erreur est survenue lors du chargement de cette page de paiement.";
  }

  switch (error.message) {
    case "student_not_found":
      return "Aucun profil etudiant correspondant a votre compte n'a ete trouve.";
    case "resource_not_found":
      return "La ressource demandee est introuvable.";
    case "resource_access_denied":
      return "Cette ressource n'est pas accessible avec votre compte etudiant.";
    case "resource_programme_missing":
      return "Cette ressource n'est pas encore reliee a un programme.";
    default:
      return error.message;
  }
};

export default async function ManualPaymentPage({ params }: ManualPaymentPageProps) {
  const { type, id } = await params;

  if (!allowedTypes.includes(type as CommandeCategory)) {
    notFound();
  }

  const category = type as CommandeCategory;
  let data: Awaited<ReturnType<typeof getCommandeCheckoutPageData>> | null = null;
  let loadError: unknown = null;

  try {
    data = await getCommandeCheckoutPageData(category, id);
  } catch (error) {
    if (error instanceof Error && error.message === "auth_required") {
      redirect(`/signin?next=${encodeURIComponent(`/paiement/${category}/${id}`)}`);
    }

    loadError = error;
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
        <div className="w-full max-w-2xl rounded-3xl border border-error-200 bg-white p-8 shadow-theme-sm dark:border-error-500/30 dark:bg-white/[0.03]">
          <div className="text-sm font-medium uppercase tracking-[0.2em] text-error-600">Paiement indisponible</div>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white/90">Impossible de charger cette page</h1>
          <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{getErrorMessage(loadError)}</p>
        </div>
      </main>
    );
  }

  const categoryLabel = getCommandeCategoryLabel(category);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/ressources"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
              >
                Retour a mes ressources
              </Link>
              <div className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-brand-500">Paiement etudiant</div>
              <h1 className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white/90">
                Paiement manuel de {categoryLabel.toLowerCase()}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                Ressource ciblee: <span className="font-medium text-gray-700 dark:text-gray-200">{data.resource.title}</span>
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="text-gray-500 dark:text-gray-400">Acces direct ressource</div>
              <Link
                href={getProductPath(category, id)}
                className="mt-1 inline-block font-semibold text-brand-600 hover:underline dark:text-brand-300"
              >
                Ouvrir le produit
              </Link>
            </div>
          </div>
        </section>

        <ManualPaymentFlow category={category} resourceId={id} data={data} />
      </div>
    </main>
  );
}
