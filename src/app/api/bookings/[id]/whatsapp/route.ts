import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import { sendWhatsAppText } from "@/lib/services/whatsapp";
import { db } from "@/lib/db";
import { messages, bookings, clients } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { jsonError } from "@/lib/route-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: { client: true },
    });
    if (!booking) {
      return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
    }

    const body = await req.json();
    const content = String(body.message || "").trim();
    if (!content) {
      return NextResponse.json({ ok: false, error: "Message is required" }, { status: 400 });
    }

    const logOnly = Boolean(body.logOnly);
    if (!logOnly) {
      try {
        await sendWhatsAppText(booking.client.phone, content);
      } catch (err: any) {
        console.error("WhatsApp Cloud API send failed:", err);
        return NextResponse.json({
          ok: false,
          error: err?.message || "WhatsApp Cloud API failed. Use the 'Open in WhatsApp' button instead.",
        }, { status: 500 });
      }
    }

    const newMsg = {
      id: randomUUID(),
      bookingId: booking.id,
      channel: "whatsapp" as const,
      direction: "outbound" as const,
      content,
      createdAt: new Date(),
    };

    await db.insert(messages).values(newMsg);

    if (booking.hubspotDealId && booking.client.hubspotContactId) {
      const { logMessage } = await import("@/lib/services/hubspot");
      try {
        await logMessage(booking.client.hubspotContactId, content, "outbound");
      } catch (err) {
        console.error("HubSpot log failed", err);
      }
    }

    return NextResponse.json({ ok: true, data: newMsg });
  } catch (err) {
    return jsonError(err);
  }
}
