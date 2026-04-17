import { NextResponse } from "next/server";

import { mailService } from "@/utils/mail";

const toSmtpErrorResponse = (error: unknown) => {
  const smtpError = error as Error & { code?: string };
  const retryableCodes = new Set(["ECONNREFUSED", "ETIMEDOUT", "EHOSTUNREACH", "ENOTFOUND", "ESOCKET"]);
  const isConnectionError = retryableCodes.has(smtpError.code ?? "");

  if (isConnectionError) {
    return {
      status: 503,
      payload: {
        ok: false,
        code: "smtp_unreachable",
        message: "SMTP unreachable. Verify MAIL_HOST/MAIL_PORT/MAIL_SECURE and server firewall/network access.",
      },
    };
  }

  return {
    status: 500,
    payload: {
      ok: false,
      code: "smtp_test_failed",
      message: error instanceof Error ? error.message : "Mail test failed",
    },
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recipient = searchParams.get("to")?.trim() ?? "";

  try {
    const transport = await mailService.test();
    const result = await mailService.sendTestMail(recipient);

    return NextResponse.json({
      ok: true,
      transport,
      result,
    });
  } catch (error) {
    console.error("Mail test failed", error);
    const response = toSmtpErrorResponse(error);

    return NextResponse.json(response.payload, { status: response.status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as { to?: string };
    const transport = await mailService.test();
    const result = await mailService.sendTestMail(payload.to);

    return NextResponse.json({
      ok: true,
      transport,
      result,
    });
  } catch (error) {
    console.error("Mail test failed", error);
    const response = toSmtpErrorResponse(error);

    return NextResponse.json(response.payload, { status: response.status });
  }
}
