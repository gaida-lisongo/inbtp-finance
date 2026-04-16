import { NextResponse } from "next/server";

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function GET(request: Request, context: { params: Promise<{ notificationSujetId: string }> }) {
  const { notificationSujetId: notificationSujetIdRaw } = await context.params;
  const notificationSujetId = normalizeText(notificationSujetIdRaw);
  const url = new URL(request.url);
  const type = normalizeText(url.searchParams.get("type"));

  if (!notificationSujetId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const redirectUrl = new URL(`/notifications/sujets/${encodeURIComponent(notificationSujetId)}`, request.url);
  if (type) {
    redirectUrl.searchParams.set("document_type", type);
  }

  return NextResponse.redirect(redirectUrl);
}
