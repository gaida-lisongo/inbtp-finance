import ProductPage from "@/components/product/ProductPage";

type ProductRoutePageProps = {
  params: Promise<{
    type: string;
    product_id: string;
  }>;
  searchParams: Promise<{
    stage_request?: string;
    stage_error?: string;
    sujet_request?: string;
    sujet_error?: string;
    sujet_notification?: string;
  }>;
};

export default async function ProductRoutePage({ params, searchParams }: ProductRoutePageProps) {
  const { type, product_id: productId } = await params;
  const query = await searchParams;

  return <ProductPage type={type} productId={productId} query={query} />;
}
