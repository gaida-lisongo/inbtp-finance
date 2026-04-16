import ValidationCheckingClient from "./ValidationCheckingClient";

type CheckingPageProps = {
  params: Promise<{ product_id: string }>;
  searchParams: Promise<{ student_id?: string; order?: string }>;
};

export default async function ValidationCheckingPage({ params, searchParams }: CheckingPageProps) {
  const { product_id: productId } = await params;
  const query = await searchParams;

  return <ValidationCheckingClient productId={productId} studentId={query.student_id} order={query.order} />;
}
