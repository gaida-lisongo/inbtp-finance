import { cookies, headers } from "next/headers";

import {
  buildPaymentSummaryPdfBuffer,
  getPaymentReportContext,
  resolvePaymentReportType,
  sendPaymentReportByMail,
} from "@/lib/reports/paiements";

type ReportRouteProps = {
  params: Promise<{
    modaliteId: string;
    reportType: string;
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

export async function GET(_: Request, { params }: ReportRouteProps) {
  try {
    const { modaliteId, reportType } = await params;
    const numericModaliteId = Number(modaliteId);
    const resolvedReportType = resolvePaymentReportType(reportType);

    if (!Number.isInteger(numericModaliteId) || !resolvedReportType) {
      return Response.json(
        {
          ok: false,
          message: "Parametres de rapport invalides.",
        },
        { status: 400 },
      );
    }

    const timestamp = Date.now();
    const cookieStore = await cookies();
    const origin = await getRequestOrigin();
    const context = await getPaymentReportContext({
      modaliteId: numericModaliteId,
      reportType: resolvedReportType,
      timestamp,
      origin,
      cookieStore,
    });
    const pdfBuffer = await buildPaymentSummaryPdfBuffer(context);
    const filename = `rapport-${resolvedReportType}-${context.modalite.slug || context.modaliteId}-${timestamp}.pdf`;

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
        message: error instanceof Error ? error.message : "Erreur de generation du rapport.",
      },
      { status: 500 },
    );
  }
}

export async function POST(_: Request, { params }: ReportRouteProps) {
  try {
    const { modaliteId, reportType } = await params;
    const numericModaliteId = Number(modaliteId);
    const resolvedReportType = resolvePaymentReportType(reportType);

    if (!Number.isInteger(numericModaliteId) || !resolvedReportType) {
      return Response.json(
        {
          ok: false,
          message: "Parametres de soumission invalides.",
        },
        { status: 400 },
      );
    }

    const timestamp = Date.now();
    const cookieStore = await cookies();
    const origin = await getRequestOrigin();
    const context = await getPaymentReportContext({
      modaliteId: numericModaliteId,
      reportType: resolvedReportType,
      timestamp,
      origin,
      cookieStore,
    });
    const pdfBuffer = await buildPaymentSummaryPdfBuffer(context);
    const delivery = await sendPaymentReportByMail({
      context,
      pdfBuffer,
    });

    return Response.json(
      {
        ok: true,
        message: `Le rapport a ete envoye a ${delivery.to} avec copie a ${delivery.cc}.`,
        reference: context.documentReference,
        recipients: delivery,
      },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Erreur de soumission du rapport.",
      },
      { status: 500 },
    );
  }
}
