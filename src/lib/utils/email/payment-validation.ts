import { sendMail } from "@/utils/mail";

type ValidationEmailInput = {
  to: string;
  studentName: string;
  resourceLabel: string;
  channel: string;
  amount: number;
  currency: string;
  orderNumber: string;
};

const appBaseUrl = process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "") ?? "https://example.com";

export const sendPaymentValidationEmail = async (input: ValidationEmailInput) => {
  const validationUrl = `${appBaseUrl}/commande/validate/${encodeURIComponent(input.orderNumber)}`;
  const subject = `Validation du paiement - ${input.resourceLabel}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; background: #f5f7fb; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
        <h1 style="margin: 0 0 16px; font-size: 22px;">Validation de votre paiement</h1>
        <p style="margin: 0 0 24px;">
          Bonjour ${input.studentName}, nous avons bien reçu votre instruction de paiement pour <strong>${input.resourceLabel}</strong>.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tbody>
            <tr><td style="padding: 6px 0; color: #475569;">Order number</td><td style="padding: 6px 0; font-weight: 600;">${input.orderNumber}</td></tr>
            <tr><td style="padding: 6px 0; color: #475569;">Canal</td><td style="padding: 6px 0; font-weight: 600;">${input.channel}</td></tr>
            <tr><td style="padding: 6px 0; color: #475569;">Montant</td><td style="padding: 6px 0; font-weight: 600;">${input.amount.toLocaleString("fr-FR")} ${input.currency}</td></tr>
          </tbody>
        </table>
        <a href="${validationUrl}" style="display: inline-flex; align-items: center; justify-content: center; padding: 14px 22px; border-radius: 999px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600;">
          Confirmer la transaction
        </a>
        <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
          En cliquant sur le bouton ci-dessus, nous vérifions l’état du paiement via FlexPay et nous mettons à jour votre commande.
        </p>
      </div>
    </div>
  `;

  await sendMail({
    to: input.to,
    subject,
    html,
  });
};
