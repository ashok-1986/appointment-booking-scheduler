import { NextRequest, NextResponse } from "next/server";
import { logInboundMessage } from "@/lib/workflows";
import { db } from "@/lib/db";
import { bookings, clients } from "@/lib/schema";
import { eq } from "drizzle-orm";

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN ??
  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ??
  "dev-token";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    const status = change?.value?.statuses?.[0];

    if (message) {
      const from = message.from;
      const text = message.text?.body ?? "";
      // Find booking by client phone
      const client = await db.query.clients.findFirst({
        where: eq(clients.phone, from),
      });
      if (client) {
        const booking = await db.query.bookings.findFirst({
          where: eq(bookings.clientId, client.id),
        });
        if (booking) {
          await logInboundMessage(booking.id, text, from);
        }
      }
    }

    if (status) {
      // Update delivery status on the message row
      const { messages } = await import("@/lib/schema");
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
