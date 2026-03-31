type LaboratoryInvoiceViewProps = {
  productId: string;
  title: string;
  studentName: string;
  description: string | null;
};

export default function LaboratoryInvoiceView({
  productId,
  title,
  studentName,
  description,
}: LaboratoryInvoiceViewProps) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="inline-flex rounded-full bg-success-50 px-4 py-1 text-sm font-medium text-success-700 dark:bg-success-500/10 dark:text-success-300">
        Invoice laboratoire
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-gray-900 dark:text-white/90">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
        Cette vue permet de generer une facture authentifiable. Le charge du laboratoire pourra scanner le QR code pour verifier si
        l&apos;etudiant est en ordre.
      </p>

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

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={`/product/laboratoire/${productId}/invoice`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          Generer l&apos;invoice PDF
        </a>
        <span className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
          Verification publique via QR code integre
        </span>
      </div>
    </section>
  );
}
