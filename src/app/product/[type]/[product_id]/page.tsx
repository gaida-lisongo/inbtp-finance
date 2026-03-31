import ProductPage from "@/components/product/ProductPage";

type ProductRoutePageProps = {
  params: Promise<{
    type: string;
    product_id: string;
  }>;
};

export default async function ProductRoutePage({ params }: ProductRoutePageProps) {
  const { type, product_id: productId } = await params;

  return <ProductPage type={type} productId={productId} />;
}
