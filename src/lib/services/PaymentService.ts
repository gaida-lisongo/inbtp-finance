type Currency = "CDF" | "USD";
type PaymentChannel = "MOBILE_MONEY" | "CREDIT_CARD";

export interface CollectMobileMoneyPayload {
  channel: "MOBILE_MONEY";
  amount: number;
  currency: Currency;
  reference: string;
  phone: string;
}

export interface CollectCardPayload {
  channel: "CREDIT_CARD";
  amount: number;
  currency: Currency;
  reference: string;
  description?: string;
}

export type CollectPayload = CollectMobileMoneyPayload | CollectCardPayload;

export interface PayoutPayload {
  amount: number;
  currency: Currency;
  phone: string;
  reference: string;
}

export interface PaymentResponse {
  success: boolean;
  provider?: string;
  channel?: PaymentChannel;
  message?: string;
  data?: unknown;
  error?: string;
}

const getBaseUrl = (): string => {
  const url = process.env.PAYMENT_SERVICE;
  if (!url) {
    throw new Error("Missing PAYMENT_SERVICE environment variable");
  }
  return url.replace(/\/+$/, "");
};

const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  const last9 = digits.length > 9 ? digits.slice(-9) : digits;
  return `243${last9}`;
};

export class PaymentService {
  private static instance: PaymentService | null = null;
  private baseUrl: string;

  private constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService(getBaseUrl());
    }
    return PaymentService.instance;
  }

  private async fetchJson(endpoint: string, options: RequestInit = {}) {
    const resp = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    const payload = await (resp.json().catch(() => ({})));

    if (!resp.ok) {
      const message = (payload as any)?.message || `Payment service error ${resp.status}`;
      throw new Error(message);
    }

    return payload;
  }

  async collect(payload: CollectPayload): Promise<PaymentResponse> {
    if (!payload.amount || !payload.currency || !payload.reference || !payload.channel) {
      throw new Error("channel, amount, currency et reference sont requis");
    }

    if (payload.channel === "MOBILE_MONEY") {
      const body = {
        channel: payload.channel,
        amount: payload.amount,
        currency: payload.currency,
        reference: payload.reference,
        phone: normalizePhone(payload.phone),
      };

      const data = await this.fetchJson("/collect", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return {
        success: (data as any)?.code === "0" || true,
        provider: "flexpay",
        channel: payload.channel,
        message: (data as any)?.message ?? "Collecte mobile money initiée",
        data,
      };
    }

    if (payload.channel === "CREDIT_CARD") {
      const body = {
        channel: payload.channel,
        amount: payload.amount,
        currency: payload.currency,
        reference: payload.reference,
        description: payload.description ?? "Paiement via FlexPay",
      };

      const data = await this.fetchJson("/collect", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return {
        success: (data as any)?.code === "0" || true,
        provider: "flexpay",
        channel: payload.channel,
        message: (data as any)?.message ?? "Collecte par carte initiée",
        data,
      };
    }

    throw new Error(`Channel non supporté: ${payload.channel}`);
  }

  async check(orderNumber: string): Promise<PaymentResponse> {
    if (!orderNumber) {
      throw new Error("orderNumber est requis");
    }

    const data = await this.fetchJson(`/check?orderNumber=${encodeURIComponent(orderNumber)}`);

    return {
      success: (data as any)?.code === "0" || true,
      provider: "flexpay",
      message: (data as any)?.message ?? "Vérification transaction",
      data,
    };
  }

  async payout(payload: PayoutPayload): Promise<PaymentResponse> {
    if (!payload.amount || !payload.currency || !payload.reference || !payload.phone) {
      throw new Error("amount, currency, phone et reference sont requis");
    }

    const body = {
      amount: payload.amount,
      currency: payload.currency,
      phone: normalizePhone(payload.phone),
      reference: payload.reference,
    };

    const data = await this.fetchJson("/payout", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      success: (data as any)?.code === "0" || true,
      provider: "flexpay",
      message: (data as any)?.message ?? "Payout initié",
      data,
    };
  }
}
