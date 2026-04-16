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

  const redirectPath =
    type === "protocol"
      ? `/checking/protocol/${encodeURIComponent(notificationSujetId)}`
      : `/notifications/sujets/${encodeURIComponent(notificationSujetId)}`;

  const redirectUrl = new URL(redirectPath, request.url);

  return NextResponse.redirect(redirectUrl);
}
