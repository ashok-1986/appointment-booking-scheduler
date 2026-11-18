import { NextRequest, NextResponse } from "next/server";
import { logInboundMessage } from "@/lib/workflows";
import { db } from "@/lib/db";
import { bookings, clients, messages } from "@/lib/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { verifyWhatsAppWebhookSignature } from "@/lib/services/whatsapp";
import { normalizePhoneNumber, selectActiveBooking } from "@/lib/services/phone-normalizer";

function getVerifyToken(): string | null {
  const token =
    process.env.WHATSAPP_VERIFY_TOKEN ||
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (token) return token;
  if (process.env.NODE_ENV !== "production") {
    return "dev-token";
  }
  return null;
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  const expectedToken = getVerifyToken();
  if (!expectedToken) {
    console.error("WhatsApp verify token is not configured in environment");
    return new NextResponse("Webhook verification not configured", { status: 500 });
  }

  if (mode === "subscribe" && token === expectedToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-hub-signature-256") ||
      req.headers.get("X-Hub-Signature-256");

    const appSecret =
      process.env.WHATSAPP_APP_SECRET ||
      process.env.META_APP_SECRET;

    if (appSecret) {
      if (!verifyWhatsAppWebhookSignature(rawBody, signature, appSecret)) {
        console.warn("Invalid WhatsApp webhook signature received");
        return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error("WHATSAPP_APP_SECRET is not configured in production");
      return NextResponse.json(
        { ok: false, error: "Webhook signature secret is not configured" },
        { status: 500 }
      );
    }

    const body = JSON.parse(rawBody);
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    const status = change?.value?.statuses?.[0];

    if (message) {
      const from = message.from;
      const text = message.text?.body ?? "";

      const { queryVariants } = normalizePhoneNumber(from);

      // Match client across phone number variants
      const allClients = await db.query.clients.findMany({
        where: inArray(clients.phone, queryVariants),
      });
      const client = allClients[0];

      if (client) {
        // Query client bookings ordered by newest first
        const clientBookings = await db.query.bookings.findMany({
          where: eq(bookings.clientId, client.id),
          orderBy: [desc(bookings.createdAt)],
        });

        const activeBooking = selectActiveBooking(clientBookings);
        if (activeBooking) {
          await logInboundMessage(activeBooking.id, text, from);
        }
      }
    }

    if (status) {
      // Update delivery status on the message row
      await db
        .update(messages)
        .set({ deliveryStatus: status.status })
        .where(eq(messages.id, status.id));
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("WhatsApp webhook error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Webhook error" },
      { status: 500 }
    );
  }
}
