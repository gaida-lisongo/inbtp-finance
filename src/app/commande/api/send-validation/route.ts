import { NextResponse } from "next/server";

import { sendPaymentValidationEmail } from "@/lib/utils/email/payment-validation";

export async function POST(request: Request) {
  try {
    const { studentEmail, studentName, resourceLabel, channel, amount, currency, orderNumber } = (await request.json()) as {
      studentEmail: string;
      studentName: string;
      resourceLabel: string;
      channel: string;
      amount: number;
      currency: string;
      orderNumber: string;
    };

    if (!studentEmail || !orderNumber) {
      return NextResponse.json({ ok: false, message: "studentEmail and orderNumber required" }, { status: 400 });
    }

    await sendPaymentValidationEmail({
      to: studentEmail,
      studentName,
      resourceLabel,
      channel,
      amount,
      currency,
      orderNumber,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Payment validation email failed", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Email send failed" },
      { status: 500 },
    );
  }
}
