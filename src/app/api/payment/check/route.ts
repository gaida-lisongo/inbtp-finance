import { NextResponse } from "next/server";
import { PaymentService } from "@/lib/services/PaymentService";

const service = PaymentService.getInstance();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderNumber = url.searchParams.get("orderNumber");

    if (!orderNumber) {
      return NextResponse.json({ success: false, error: "orderNumber est requis" }, { status: 400 });
    }

    const response = await service.check(orderNumber);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur vérification paiement",
      },
      { status: 500 },
    );
  }
}
