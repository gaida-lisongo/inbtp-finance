import { NextResponse } from "next/server";

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function GET(request: Request, context: { params: Promise<{ product_id: string }> }) {
  const { product_id: productIdRaw } = await context.params;
  const productId = normalizeText(productIdRaw);
  const url = new URL(request.url);
  const studentId = normalizeText(url.searchParams.get("student_id"));
  const orderReference = normalizeText(url.searchParams.get("order"));

  if (!productId || !studentId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const redirectUrl = new URL(`/checking/laboratoire/${encodeURIComponent(productId)}`, request.url);
  redirectUrl.searchParams.set("student_id", studentId);

  if (orderReference) {
    redirectUrl.searchParams.set("order", orderReference);
  }

  return NextResponse.redirect(redirectUrl);
}
