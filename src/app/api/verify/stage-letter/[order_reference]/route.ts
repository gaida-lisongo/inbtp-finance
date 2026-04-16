import { NextResponse } from "next/server";

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function GET(request: Request, context: { params: Promise<{ order_reference: string }> }) {
  const { order_reference: orderReferenceRaw } = await context.params;
  const orderReference = normalizeText(orderReferenceRaw);
  const url = new URL(request.url);
  const studentId = normalizeText(url.searchParams.get("student_id"));

  if (!orderReference || !studentId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const redirectUrl = new URL(`/checking/stage-letter/${encodeURIComponent(orderReference)}`, request.url);
  redirectUrl.searchParams.set("student_id", studentId);

  return NextResponse.redirect(redirectUrl);
}

