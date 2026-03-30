import CommandePage from "@/components/commande/CommandePage";

type StagesCommandePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StagesCommandePage({ params }: StagesCommandePageProps) {
  const { id } = await params;

  return <CommandePage category="stages" resourceId={id} />;
}
