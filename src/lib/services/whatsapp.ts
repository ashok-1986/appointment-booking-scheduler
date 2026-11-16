import "dotenv/config";

const GRAPH_URL = "https://graph.facebook.com/v18.0";

function getConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp credentials are not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID."
    );
  }
  return { token, phoneNumberId };
}

export type WhatsAppMessage = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "template" | "text";
  template?: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: "header" | "body" | "buttons";
      parameters?: Array<{
        type: "text" | "image" | "document" | "currency" | "date_time";
        text?: string;
      }>;
    }>;
  };
  text?: { body: string; preview_url?: boolean };
};

export type WhatsAppResponse = {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
};

export async function sendWhatsAppMessage(
  to: string,
  message: Omit<WhatsAppMessage, "messaging_product" | "recipient_type" | "to">
): Promise<WhatsAppResponse> {
  const { token, phoneNumberId } = getConfig();
  const payload: WhatsAppMessage = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    ...message,
  };
  const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body as { error?: { message?: string } };
    throw new Error(
      `WhatsApp error ${res.status}: ${err?.error?.message || res.statusText}`
    );
  }
  return body as WhatsAppResponse;
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  parameters: string[] = [],
  language = "en"
): Promise<WhatsAppResponse> {
  return sendWhatsAppMessage(to, {
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components: parameters.length
        ? [
            {
              type: "body",
              parameters: parameters.map((text) => ({ type: "text", text })),
            },
          ]
        : undefined,
    },
  });
}

export async function sendWhatsAppText(
  to: string,
  body: string
): Promise<WhatsAppResponse> {
  return sendWhatsAppMessage(to, { type: "text", text: { body } });
}

/** Build a payment-link message that mirrors the email copy. */
export function buildPaymentLinkMessage(
  clientName: string,
  amount: number,
  currency: string,
  linkUrl: string,
  kind: "deposit" | "balance"
): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
  return (
    `Hi ${clientName}, your ${kind} payment of ${formatted} is ready. ` +
    `Pay securely here: ${linkUrl}`
  );
}
