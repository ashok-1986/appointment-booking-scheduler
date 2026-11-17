import crypto from "crypto";
import "dotenv/config";

const BASE_URL = "https://api.razorpay.com/v1";

export type RazorpayConfig = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
};

function getConfig(): RazorpayConfig {
  const keyId = process.env.RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
  }
  return { keyId, keySecret, webhookSecret };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { keyId, keySecret } = getConfig();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body as { error?: { code?: string; description?: string } };
    throw new Error(
      `Razorpay error ${res.status}: ${err?.error?.description || err?.error?.code || res.statusText}`
    );
  }
  return body as T;
}

export type CreatePaymentLinkInput = {
  amount: number; // paise
  currency?: string;
  referenceId: string; // booking id
  description: string;
  callbackUrl?: string;
  expirySeconds?: number;
  customer?: { name?: string; email?: string; contact?: string };
};

export type PaymentLink = {
  id: string;
  short_url: string;
  long_url: string;
  status: string;
  amount: number;
  currency: string;
  expires_at?: number;
};

export async function createPaymentLink(
  input: CreatePaymentLinkInput
): Promise<PaymentLink> {
  const payload: Record<string, unknown> = {
    amount: input.amount,
    currency: input.currency ?? "INR",
    accept_partial: false,
    description: input.description,
    reference_id: input.referenceId,
  };
  if (input.callbackUrl) payload.callback_url = input.callbackUrl;
  if (input.expirySeconds) {
    payload.expire_by = Math.floor(Date.now() / 1000) + input.expirySeconds;
  }
  if (input.customer) {
    payload.customer = input.customer;
    payload.notify = { sms: true, email: true };
    payload.reminder_enable = true;
  }
  return request<PaymentLink>("/payment_links", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type Payment = {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id?: string;
  invoice_id?: string;
  method?: string;
  created_at: number;
};

export async function fetchPayment(paymentId: string): Promise<Payment> {
  return request<Payment>(`/payments/${paymentId}`);
}

export async function fetchPaymentLink(
  linkId: string
): Promise<PaymentLink & { payments?: Payment[] }> {
  return request(`${BASE_URL}/payment_links/${linkId}` as unknown as string);
}

/** Verify Razorpay webhook signature (HMAC-SHA256 of raw body). */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Verify a Checkout payment signature (razorpay_signature). */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const { keySecret } = getConfig();
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
