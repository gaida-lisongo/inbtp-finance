type StageLetterRequestViewProps = {
  productId: string;
  title: string;
  studentName: string;
  description: string | null;
  requestStatus?: string;
  requestError?: string;
  requestLocked?: boolean;
};

export default function StageLetterRequestView({
  productId,
  title,
  studentName,
  description,
  requestStatus,
  requestError,
  requestLocked = false,
}: StageLetterRequestViewProps) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="inline-flex rounded-full bg-brand-50 px-4 py-1 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
        Lettre de stage
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-gray-900 dark:text-white/90">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
        Renseignez le destinataire de la lettre. A la validation, une demande sera envoyee aux organisateurs pour generation officielle.
      </p>

      {requestStatus === "success" ? (
        <div className="mt-4 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
          Demande enregistree. L&apos;administration traitera votre lettre de stage puis vous notifiera.
        </div>
      ) : null}

      {requestError ? (
        <div className="mt-4 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
          {requestError}
        </div>
      ) : null}

      {requestLocked ? (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
          Cette demande a deja ete traitee et delivree. Une nouvelle soumission n&apos;est plus autorisee.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2">
        <div>
          <div className="text-gray-500 dark:text-gray-400">Etudiant</div>
          <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{studentName}</div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">Produit</div>
          <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{title}</div>
        </div>
        {description ? (
          <div className="sm:col-span-2">
            <div className="text-gray-500 dark:text-gray-400">Contexte</div>
            <div className="mt-1 whitespace-pre-line text-gray-700 dark:text-gray-300">{description}</div>
          </div>
        ) : null}
      </div>

      <form
        action={`/product/stages/${productId}/letter`}
        method="post"
        className="mt-6 grid gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="recipient_name">
            Nom du destinataire
          </label>
          <input
            id="recipient_name"
            name="recipient_name"
            required
            placeholder="Ex: Jean Mukendi"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="recipient_quality">
            Qualite du destinataire
          </label>
          <input
            id="recipient_quality"
            name="recipient_quality"
            required
            placeholder="Ex: Directeur des ressources humaines"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="recipient_sex">
            Sexe du destinataire
          </label>
          <select
            id="recipient_sex"
            name="recipient_sex"
            required
            defaultValue="M"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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
            placeholder="Ex: Gecamines SA"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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
            placeholder="Ex: Lubumbashi"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={requestLocked}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Soumettre la demande de lettre
          </button>
        </div>
      </form>
    </section>
  );
}
