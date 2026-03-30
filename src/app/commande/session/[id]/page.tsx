import CommandePage from "@/components/commande/CommandePage";

type SessionCommandePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SessionCommandePage({ params }: SessionCommandePageProps) {
  const { id } = await params;

  return <CommandePage category="session" resourceId={id} />;
}
