import CommandePage from "@/components/commande/CommandePage";

type LaboratoireCommandePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LaboratoireCommandePage({ params }: LaboratoireCommandePageProps) {
  const { id } = await params;

  return <CommandePage category="laboratoire" resourceId={id} />;
}
