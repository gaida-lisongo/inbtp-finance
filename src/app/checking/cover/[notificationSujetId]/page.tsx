import CoverCheckingClient from "./CoverCheckingClient";

type CheckingPageProps = {
  params: Promise<{ notificationSujetId: string }>;
};

export default async function CoverCheckingPage({ params }: CheckingPageProps) {
  const { notificationSujetId } = await params;

  return <CoverCheckingClient notificationSujetId={notificationSujetId} />;
}
