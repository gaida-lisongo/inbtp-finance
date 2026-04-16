import StageLetterCheckingClient from "./StageLetterCheckingClient";

type CheckingPageProps = {
  params: Promise<{ order_reference: string }>;
  searchParams: Promise<{ student_id?: string }>;
};

export default async function StageLetterCheckingPage({ params, searchParams }: CheckingPageProps) {
  const { order_reference: orderReference } = await params;
  const query = await searchParams;

  return <StageLetterCheckingClient orderReference={orderReference} studentId={query.student_id} />;
}

