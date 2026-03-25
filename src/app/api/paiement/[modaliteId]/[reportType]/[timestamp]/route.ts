import { cookies, headers } from "next/headers";

import {
  buildPaymentDetailPdfBuffer,
  getPaymentReportContext,
  resolvePaymentReportType,
} from "@/lib/reports/paiements";

type PaymentDetailRouteProps = {
  params: Promise<{
    modaliteId: string;
    reportType: string;
    timestamp: string;
  }>;
};

export const runtime = "nodejs";

const getRequestOrigin = async () => {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");

  if (!host) {
    throw new Error("Impossible de determiner l'hote de la requete.");
  }

  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProto ?? (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${protocol}://${host}`;
};

export async function GET(_: Request, { params }: PaymentDetailRouteProps) {
  try {
    const { modaliteId, reportType, timestamp } = await params;
    const numericModaliteId = Number(modaliteId);
    const numericTimestamp = Number(timestamp);
    const resolvedReportType = resolvePaymentReportType(reportType);

    if (
      !Number.isInteger(numericModaliteId) ||
      !Number.isFinite(numericTimestamp) ||
      !resolvedReportType
    ) {
      return Response.json(
        {
          ok: false,
          message: "Parametres du rapport detaille invalides.",
        },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const origin = await getRequestOrigin();
    const context = await getPaymentReportContext({
      modaliteId: numericModaliteId,
      reportType: resolvedReportType,
      timestamp: numericTimestamp,
      origin,
      cookieStore,
    });
    const pdfBuffer = await buildPaymentDetailPdfBuffer(context);
    const filename = `rapport-detail-${resolvedReportType}-${context.modalite.slug || context.modaliteId}-${numericTimestamp}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Erreur de generation du detail du rapport.",
      },
      { status: 500 },
    );
  }
}
