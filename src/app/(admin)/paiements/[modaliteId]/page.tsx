import PageBreadcrumb from "@/components/common/PageBreadCrumb";

type PaiementsPageProps = {
  params: Promise<{
    modaliteId: string;
  }>;
};

export default async function PaiementsPage({ params }: PaiementsPageProps) {
  const { modaliteId } = await params;

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Paiements" />

      <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        La page de paiement pour la modalite <span className="font-semibold">{modaliteId}</span> sera implementee ensuite.
      </div>
    </div>
  );
}
