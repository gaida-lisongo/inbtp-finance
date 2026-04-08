import Link from "next/link";
import { redirect } from "next/navigation";

import OrderCheckoutFlow from "@/components/commande/OrderCheckoutFlow";
import {
  getCommandeCategoryLabel,
  getCommandeCheckoutPageData,
  getCommandeStudentDisplayName,
  getProductPath,
  type CommandeCategory,
} from "@/lib/utils/supabase/commandes";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

type CommandePageProps = {
  category: CommandeCategory;
  resourceId: string;
};

const getErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Une erreur est survenue lors du chargement de cette commande.";
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

export default async function CommandePage({ category, resourceId }: CommandePageProps) {
  let data: Awaited<ReturnType<typeof getCommandeCheckoutPageData>> | null = null;
  let loadError: unknown = null;

  try {
    data = await getCommandeCheckoutPageData(category, resourceId);
  } catch (error) {
    if (error instanceof Error && error.message === "auth_required") {
      redirect(`/signin?next=${encodeURIComponent(`/commande/${category}/${resourceId}`)}`);
    }

    if (error instanceof Error && error.message === "student_not_found") {
      const user = await getAuthenticatedUser();

      if (user?.activePersona === "admin") {
        redirect(`/commandes/categories/${category}`);
      }
    }

    loadError = error;
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
        <div className="w-full max-w-2xl rounded-3xl border border-error-200 bg-white p-8 shadow-theme-sm dark:border-error-500/30 dark:bg-white/[0.03]">
          <div className="text-sm font-medium uppercase tracking-[0.2em] text-error-600">Commande indisponible</div>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white/90">Impossible de charger cette commande</h1>
          <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{getErrorMessage(loadError)}</p>
        </div>
      </main>
    );
  }

  const resourceLabel = getCommandeCategoryLabel(category);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/ressources"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
              >
                Retour a mes ressources
              </Link>
              <div className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-brand-500">Commande etudiante</div>
              <h1 className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white/90">
                Paiement de {resourceLabel.toLowerCase()}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                Ressource ciblee: <span className="font-medium text-gray-700 dark:text-gray-200">{data.resource.title}</span>
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="text-gray-500 dark:text-gray-400">Etudiant connecte</div>
              <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{getCommandeStudentDisplayName(data.student)}</div>
              <div className="mt-1 text-gray-600 dark:text-gray-300">{data.student.email ?? "Aucun email"}</div>
            </div>
          </div>
        </div>

        {data.existingSuccessCommande ? (
          <div className="rounded-3xl border border-success-200 bg-white p-8 shadow-theme-sm dark:border-success-500/30 dark:bg-white/[0.03]">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-success-50 px-4 py-1 text-sm font-medium text-success-700 dark:bg-success-500/10 dark:text-success-300">
                Commande deja validee
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-gray-900 dark:text-white/90">Votre commande est deja marquee comme payee</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                La ressource est disponible directement dans l&apos;application. Vous pouvez l&apos;ouvrir sans passer par une validation email.
              </p>
              <div className="mt-6 grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm dark:border-gray-800 dark:bg-gray-900 md:grid-cols-2">
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Numero de commande</div>
                  <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">
                    {data.existingSuccessCommande.orderNumber ?? "Non renseigne"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Date</div>
                  <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">
                    {new Date(data.existingSuccessCommande.created_at).toLocaleString("fr-FR")}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href={getProductPath(category, resourceId)}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
                >
                  Acceder a la ressource
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <OrderCheckoutFlow category={category} resource={data.resource} student={data.student} />
        )}

      </div>
    </main>
  );
}
