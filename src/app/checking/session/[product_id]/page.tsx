import SessionCheckingClient from "./SessionCheckingClient";

type CheckingPageProps = {
  params: Promise<{ product_id: string }>;
  searchParams: Promise<{ student_id?: string; order?: string }>;
};

export default async function SessionCheckingPage({ params, searchParams }: CheckingPageProps) {
  const { product_id: productId } = await params;
  const query = await searchParams;

  return <SessionCheckingClient productId={productId} studentId={query.student_id} order={query.order} />;
}
