import { NextResponse } from "next/server";
import { PaymentService } from "@/lib/services/PaymentService";

export async function OPTIONS() {
  return NextResponse.json({ ok: true }, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

export async function POST(request: Request) {
  try {
    const service = PaymentService.getInstance();
    const body = await request.json();

    const response = await service.payout(body as any);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur payout",
      },
      { status: 500 },
    );
  }
}
