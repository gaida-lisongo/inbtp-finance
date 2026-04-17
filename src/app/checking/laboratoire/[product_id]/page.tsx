import LaboratoireCheckingClient from "./LaboratoireCheckingClient";

type LaboratoireCheckingPageProps = {
  params: Promise<{ product_id: string }>;
  searchParams: Promise<{ student_id?: string; order?: string }>;
};

export default async function LaboratoireCheckingPage({ params, searchParams }: LaboratoireCheckingPageProps) {
  const { product_id: productId } = await params;
  const query = await searchParams;

  return <LaboratoireCheckingClient productId={productId} studentId={query.student_id} order={query.order} />;
}
