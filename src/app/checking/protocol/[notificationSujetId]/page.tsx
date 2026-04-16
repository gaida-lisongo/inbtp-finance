import ProtocolCheckingClient from "./ProtocolCheckingClient";

type CheckingPageProps = {
  params: Promise<{ notificationSujetId: string }>;
};

export default async function ProtocolCheckingPage({ params }: CheckingPageProps) {
  const { notificationSujetId } = await params;

  return <ProtocolCheckingClient notificationSujetId={notificationSujetId} />;
}
