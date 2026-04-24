// src/app/api/mail/commande/route.ts
import { NextResponse } from "next/server";
import { sendMail } from "@/utils/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { recipients, orderRef, categoryLabel, amountLabel } = body;

    // Validation basique
    if (!recipients || !orderRef) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    await sendMail({
      to: recipients,
      subject: `Commande ${orderRef} validee avec succes`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px;color:#1f2937;">
          <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
            <div style="padding:20px 24px;background:#111827;color:#ffffff;">
              <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.85;">Notification paiement</div>
              <h1 style="margin:10px 0 0;font-size:22px;line-height:1.35;">Commande confirmee</h1>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.7;">
                La commande <strong>${orderRef}</strong> est passee au statut <strong>success</strong>.
              </p>
              <p style="margin:0 0 10px;font-size:14px;line-height:1.7;">
                Categorie: <strong>${categoryLabel}</strong>
              </p>
              <p style="margin:0 0 10px;font-size:14px;line-height:1.7;">
                Montant: <strong>${amountLabel}</strong>
              </p>
            </div>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erreur envoi mail API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}