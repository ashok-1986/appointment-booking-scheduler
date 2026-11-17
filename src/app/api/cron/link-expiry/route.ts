import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, payments } from "@/lib/schema";
import { eq, and, lte, ne, isNull } from "drizzle-orm";
import { sendWhatsAppText } from "@/lib/services/whatsapp";
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/services/email";

const CRON_SECRET = process.env.CRON_SECRET;

async function authorize(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: Record<string, number> = {};

  // Find created deposit/balance payments whose links expired (older than 72h for deposit, 7d for balance)
  const created = await db
    .select()
    .from(payments)
    .where(and(eq(payments.status, "created")));

  for (const p of created) {
    const createdAt = p.createdAt;
    const expiryMs = p.type === "deposit" ? 72 * 3600_000 : 7 * 24 * 3600_000;
    if (now.getTime() - createdAt.getTime() > expiryMs) {
      const booking = await db.query.bookings.findFirst({
        where: eq(bookings.id, p.bookingId),
        with: { client: true },
      });
      if (!booking) continue;

      // Mark link expired
      await db
        .update(payments)
        .set({ status: "expired" })
        .where(eq(payments.id, p.id));

      // Dashboard alert via HubSpot note
      const { addNote } = await import("@/lib/services/hubspot");
      if (booking.hubspotDealId) {
        try {
          await addNote(booking.hubspotDealId, `Payment link expired (${p.type})`);
        } catch (err) {
          console.error(err);
        }
      }

      // Follow-up message to client
      const followUp = `Hi ${booking.client.name}, your ${p.type} payment link has expired. Please reach out to get a new link.`;
      try {
        await sendWhatsAppText(booking.client.phone, followUp);
      } catch (err) {
        console.error("WhatsApp follow-up failed", err);
      }
      try {
        const email = EMAIL_TEMPLATES.balanceReminder(
          booking.client.name,
          Number(p.amount),
          "INR",
          "contact us"
        );
        await sendEmail({
          to: booking.client.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
      } catch (err) {
        console.error("Email follow-up failed", err);
      }

      results[`expired_${p.type}`] = (results[`expired_${p.type}`] ?? 0) + 1;
    }
  }

  return NextResponse.json({ ok: true, results });
}
