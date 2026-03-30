import CommandePage from "@/components/commande/CommandePage";

type SujetsCommandePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SujetsCommandePage({ params }: SujetsCommandePageProps) {
  const { id } = await params;

  return <CommandePage category="sujets" resourceId={id} />;
}
