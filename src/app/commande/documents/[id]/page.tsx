import CommandePage from "@/components/commande/CommandePage";

type DocumentsCommandePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DocumentsCommandePage({ params }: DocumentsCommandePageProps) {
  const { id } = await params;

  return <CommandePage category="documents" resourceId={id} />;
}
