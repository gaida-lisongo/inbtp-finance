import CommandePage from "@/components/commande/CommandePage";

type LaboratoireSingularCommandePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LaboratoireSingularCommandePage({ params }: LaboratoireSingularCommandePageProps) {
  const { id } = await params;

  return <CommandePage category="laboratoire" resourceId={id} />;
}
