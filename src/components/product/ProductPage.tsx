import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  getCommandeCategoryLabel,
  getCommandeStudentDisplayName,
  getProductPageData,
  type CommandeCategory,
  type ProductRenderMode,
} from "@/lib/utils/supabase/commandes";

type ProductPageProps = {
  type: string;
  productId: string;
};

const allowedTypes: CommandeCategory[] = ["documents", "session", "stages", "sujets", "laboratoire"];

const getErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Une erreur est survenue lors du chargement de cette ressource.";
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

const FormProductView = ({ title }: { title: string }) => (
  <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
    <div className="inline-flex rounded-full bg-brand-50 px-4 py-1 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
      Mode formulaire
    </div>
    <h2 className="mt-5 text-2xl font-semibold text-gray-900 dark:text-white/90">{title}</h2>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
      Cette ressource sera servie via un formulaire dedie. Le layout est en place et le branchement final du formulaire pourra etre ajoute ici.
    </p>
  </section>
);

const DocumentProductView = ({ title }: { title: string }) => (
  <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
    <div className="inline-flex rounded-full bg-success-50 px-4 py-1 text-sm font-medium text-success-700 dark:bg-success-500/10 dark:text-success-300">
      Mode document
    </div>
    <h2 className="mt-5 text-2xl font-semibold text-gray-900 dark:text-white/90">{title}</h2>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
      Cette ressource est preparee pour afficher un document genere ou telechargeable. Le conteneur de restitution est pret.
    </p>
  </section>
);

const MessageProductView = ({ title }: { title: string }) => (
  <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
    <div className="inline-flex rounded-full bg-warning-50 px-4 py-1 text-sm font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-300">
      Mode message
    </div>
    <h2 className="mt-5 text-2xl font-semibold text-gray-900 dark:text-white/90">{title}</h2>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
      Cette ressource sera exposee sous forme de message ou d&apos;instruction. Le layout de lecture est deja isole pour recevoir le contenu final.
    </p>
  </section>
);

const ProductViewSwitch = ({ mode, title }: { mode: ProductRenderMode; title: string }) => {
  switch (mode) {
    case "form":
      return <FormProductView title={title} />;
    case "document":
      return <DocumentProductView title={title} />;
    case "message":
    default:
      return <MessageProductView title={title} />;
  }
};

export default async function ProductPage({ type, productId }: ProductPageProps) {
  if (!allowedTypes.includes(type as CommandeCategory)) {
    notFound();
  }

  const category = type as CommandeCategory;
  let data: Awaited<ReturnType<typeof getProductPageData>> | null = null;
  let loadError: unknown = null;

  try {
    data = await getProductPageData(category, productId);
  } catch (error) {
    if (error instanceof Error && error.message === "auth_required") {
      redirect(`/api/login?next=${encodeURIComponent(`/product/${category}/${productId}`)}`);
    }

    loadError = error;
  }

  console.log("Product page data: ", { category, productId, data, loadError });

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
        <div className="w-full max-w-2xl rounded-3xl border border-error-200 bg-white p-8 shadow-theme-sm dark:border-error-500/30 dark:bg-white/[0.03]">
          <div className="text-sm font-medium uppercase tracking-[0.2em] text-error-600">Ressource indisponible</div>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white/90">Impossible de charger cette ressource</h1>
          <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{getErrorMessage(loadError)}</p>
        </div>
      </main>
    );
  }

  const categoryLabel = getCommandeCategoryLabel(category);
  const studentName = getCommandeStudentDisplayName(data.student);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-medium uppercase tracking-[0.2em] text-brand-500">Produit academique</div>
              <h1 className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white/90">{data.resource.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                Type: <span className="font-medium text-gray-700 dark:text-gray-200">{categoryLabel}</span>
              </p>
              {data.resource.documentCategory ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Categorie document:{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-200">{data.resource.documentCategory}</span>
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="text-gray-500 dark:text-gray-400">Etudiant connecte</div>
              <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{studentName}</div>
              <div className="mt-1 text-gray-600 dark:text-gray-300">{data.student.email ?? "Aucun email"}</div>
            </div>
          </div>
        </section>

        {!data.hasPaidAccess ? (
          <section className="rounded-3xl border border-warning-200 bg-white p-8 shadow-theme-sm dark:border-warning-500/30 dark:bg-white/[0.03]">
            <div className="inline-flex rounded-full bg-warning-50 px-4 py-1 text-sm font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-300">
              Acces verrouille
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-gray-900 dark:text-white/90">Le paiement est requis pour ouvrir cette ressource</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
              Cette page sert de proxy d&apos;acces. Tant que la commande n&apos;est pas marquee comme payee, l&apos;etudiant reste redirige vers le tunnel de commande.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={data.commandePath}
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                Ouvrir la commande
              </Link>
              <span className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                Produit cible: {data.productPath}
              </span>
            </div>
          </section>
        ) : (
          <ProductViewSwitch mode={data.renderMode} title={data.resource.title} />
        )}
      </div>
    </main>
  );
}
