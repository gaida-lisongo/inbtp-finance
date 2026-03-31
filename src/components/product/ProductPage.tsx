import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import StageLetterRequestView from "@/components/product/StageLetterRequestView";
import { getDocumentTypeLabel } from "@/lib/utils/supabase/documents-shared";
import {
  getCommandeCategoryLabel,
  getCommandeStudentDisplayName,
  getProductPageData,
  type CommandeCategory,
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

const ProductShell = ({
  badge,
  badgeClassName,
  title,
  description,
  children,
}: {
  badge: string;
  badgeClassName: string;
  title: string;
  description: string;
  children?: ReactNode;
}) => (
  <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
    <div className={`inline-flex rounded-full px-4 py-1 text-sm font-medium ${badgeClassName}`}>{badge}</div>
    <h2 className="mt-5 text-2xl font-semibold text-gray-900 dark:text-white/90">{title}</h2>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">{description}</p>
    {children ? <div className="mt-6">{children}</div> : null}
  </section>
);

const SessionProductView = ({ title, description }: { title: string; description: string | null }) => (
  <ProductShell
    badge="Formulaire de session"
    badgeClassName="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
    title={title}
    description="Cette ressource ouvre un parcours de saisie. Le cadre du formulaire est deja reserve pour la future logique metier."
  >
    <div className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2">
      <div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Etat</div>
        <div className="mt-1 font-medium text-gray-800 dark:text-white/90">Pret pour le composant formulaire</div>
      </div>
      <div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Usage</div>
        <div className="mt-1 font-medium text-gray-800 dark:text-white/90">Session academique</div>
      </div>
      {description ? (
        <div className="sm:col-span-2">
          <div className="text-sm text-gray-500 dark:text-gray-400">Contexte</div>
          <div className="mt-1 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{description}</div>
        </div>
      ) : null}
    </div>
  </ProductShell>
);

const ReleveProductView = ({ title, description }: { title: string; description: string | null }) => (
  <ProductShell
    badge="Document academique"
    badgeClassName="bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
    title={title}
    description="Le paiement valide donne acces au releve. Cette vue est reservee au rendu final du document et a ses actions de consultation."
  >
    <div className="rounded-2xl border border-success-200 bg-success-50/70 p-5 dark:border-success-500/30 dark:bg-success-500/10">
      <p className="text-sm font-medium text-success-800 dark:text-success-200">Type detecte: Releve des cotes</p>
      <p className="mt-2 text-sm leading-6 text-success-700 dark:text-success-300">
        Le conteneur de restitution est pret pour afficher le releve genere ou proposer son telechargement.
      </p>
    </div>
    {description ? (
      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        {description}
      </div>
    ) : null}
  </ProductShell>
);

const ValidationSheetProductView = ({ title, description }: { title: string; description: string | null }) => (
  <ProductShell
    badge="Document academique"
    badgeClassName="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
    title={title}
    description="Le paiement valide donne acces a la fiche de validation. Cette vue est reservee au document pedagogique et a ses prochaines actions."
  >
    <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-5 dark:border-brand-500/30 dark:bg-brand-500/10">
      <p className="text-sm font-medium text-brand-800 dark:text-brand-200">Type detecte: Fiche de validation</p>
      <p className="mt-2 text-sm leading-6 text-brand-700 dark:text-brand-300">
        Le composant de lecture est pret pour recevoir la fiche et ses controles associes.
      </p>
    </div>
    {description ? (
      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        {description}
      </div>
    ) : null}
  </ProductShell>
);

const GenericDocumentProductView = ({
  title,
  description,
  documentCategory,
}: {
  title: string;
  description: string | null;
  documentCategory: string | null;
}) => (
  <ProductShell
    badge="Document academique"
    badgeClassName="bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
    title={title}
    description="Le paiement valide donne acces a un document. Cette zone reste disponible pour les autres categories documentaires."
  >
    <div className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2">
      <div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Categorie</div>
        <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{documentCategory ?? "Document"}</div>
      </div>
      <div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Etat</div>
        <div className="mt-1 font-medium text-gray-800 dark:text-white/90">Pret pour le rendu du document</div>
      </div>
      {description ? (
        <div className="sm:col-span-2">
          <div className="text-sm text-gray-500 dark:text-gray-400">Description</div>
          <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{description}</div>
        </div>
      ) : null}
    </div>
  </ProductShell>
);

const MessageProductView = ({
  title,
  description,
  resourceTypeLabel,
}: {
  title: string;
  description: string | null;
  resourceTypeLabel: string;
}) => (
  <ProductShell
    badge="Message metier"
    badgeClassName="bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300"
    title={title}
    description={`Cette ressource ${resourceTypeLabel.toLowerCase()} sera servie sous forme de message, d'instruction ou de contenu contextualise.`}
  >
    <div className="rounded-2xl border border-warning-200 bg-warning-50/70 p-5 dark:border-warning-500/30 dark:bg-warning-500/10">
      <p className="text-sm font-medium text-warning-800 dark:text-warning-200">Conteneur metier pret</p>
      <p className="mt-2 text-sm leading-6 text-warning-700 dark:text-warning-300">
        Le proxy d&apos;acces fonctionne. Il reste a brancher ici le composant final de consultation.
      </p>
    </div>
    {description ? (
      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        {description}
      </div>
    ) : null}
  </ProductShell>
);

const ProductViewSwitch = ({
  category,
  title,
  description,
  documentCategory,
  productId,
  studentName,
}: {
  category: CommandeCategory;
  title: string;
  description: string | null;
  documentCategory: string | null;
  productId: string;
  studentName: string;
}) => {
  if (category === "session") {
    return <SessionProductView title={title} description={description} />;
  }

  if (category === "documents") {
    const normalizedCategory = documentCategory?.trim().toLowerCase();

    if (normalizedCategory === "relevés" || normalizedCategory === "releves") {
      return <ReleveProductView title={title} description={description} />;
    }

    if (normalizedCategory === "fiche de validation") {
      return <ValidationSheetProductView title={title} description={description} />;
    }

    return <GenericDocumentProductView title={title} description={description} documentCategory={documentCategory} />;
  }

  if (category === "stages") {
    return (
      <StageLetterRequestView
        productId={productId}
        title={title}
        studentName={studentName}
        description={description}
      />
    );
  }

  return <MessageProductView title={title} description={description} resourceTypeLabel={getCommandeCategoryLabel(category)} />;
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
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {getDocumentTypeLabel(data.resource.documentCategory)}
                  </span>
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
          <ProductViewSwitch
            category={category}
            title={data.resource.title}
            description={data.resource.description}
            documentCategory={data.resource.documentCategory}
            productId={productId}
            studentName={studentName}
          />
        )}
      </div>
    </main>
  );
}
