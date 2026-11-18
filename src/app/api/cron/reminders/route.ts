import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, consentRecords, messages } from "@/lib/schema";
import { eq, and, gte, lte, isNull, sql, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  EMAIL_TEMPLATES,
  sendEmail,
} from "@/lib/services/email";
import { sendWhatsAppText } from "@/lib/services/whatsapp";
import { createPaymentLink } from "@/lib/services/razorpay";
import { addNote } from "@/lib/services/hubspot";

const CRON_SECRET = process.env.CRON_SECRET;

async function authorize(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return false;
  }
  return true;
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 3600_000);
}

async function sendSessionReminder(
  booking: typeof bookings.$inferSelect & { client: { email: string; phone: string; name: string } },
  hours: number
) {
  const email = EMAIL_TEMPLATES.sessionReminder(
    booking.client.name,
    new Date(booking.sessionDate!).toLocaleString(),
    hours
  );
  await sendEmail({ to: booking.client.email, subject: email.subject, html: email.html, text: email.text });
  await sendWhatsAppText(booking.client.phone, email.text);
}

async function sendConsentReminder(
  booking: typeof bookings.$inferSelect & { client: { email: string; phone: string; name: string } },
  formUrl: string
) {
  const email = EMAIL_TEMPLATES.consentReminder(booking.client.name, formUrl);
  await sendEmail({ to: booking.client.email, subject: email.subject, html: email.html, text: email.text });
  await sendWhatsAppText(booking.client.phone, email.text);
}

async function sendBalanceReminder(
  booking: typeof bookings.$inferSelect & { client: { email: string; phone: string; name: string } },
  amount: bigint,
  linkUrl: string
) {
  const email = EMAIL_TEMPLATES.balanceReminder(
    booking.client.name,
    Number(amount),
    "INR",
    linkUrl
  );
  await sendEmail({ to: booking.client.email, subject: email.subject, html: email.html, text: email.text });
  await sendWhatsAppText(booking.client.phone, email.text);
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: Record<string, number> = {};

  // 1. Session reminders: 48h and 24h before session (Stage 5)
  for (const hours of [48, 24]) {
    const windowStart = hoursFromNow(hours - 1);
    const windowEnd = hoursFromNow(hours + 1);
    const upcoming = await db.query.bookings.findMany({
      where: and(
        eq(bookings.stage, "scheduled"),
        gte(bookings.sessionDate!, windowStart),
        lte(bookings.sessionDate!, windowEnd)
      ),
      with: { client: true },
    });
    for (const b of upcoming) {
      try {
        const templateTag = `session_reminder_${hours}h`;
        const alreadySent = await db.query.messages.findFirst({
          where: and(
            eq(messages.bookingId, b.id),
            eq(messages.templateName, templateTag)
          ),
        });
        if (alreadySent) continue;

        await sendSessionReminder(b, hours);
        await db.insert(messages).values({
          id: randomUUID(),
          bookingId: b.id,
          channel: "email",
          direction: "outbound",
          content: `Session reminder: ${hours}h before`,
          templateName: templateTag,
        });

        results[templateTag] = (results[templateTag] ?? 0) + 1;
      } catch (err) {
        console.error("Session reminder failed", b.id, err);
      }
    }
  }

  // 2. Consent reminders: 72h, 48h, 24h before session if unsigned (Stage 6)
  for (const hours of [72, 48, 24]) {
    const windowStart = hoursFromNow(hours - 1);
    const windowEnd = hoursFromNow(hours + 1);
    const unsigned = await db.query.bookings.findMany({
      where: and(
        eq(bookings.stage, "scheduled"),
        isNull(bookings.consentSignedAt),
        gte(bookings.sessionDate!, windowStart),
        lte(bookings.sessionDate!, windowEnd)
      ),
      with: { client: true },
    });
    for (const b of unsigned) {
      try {
        const templateTag = `consent_reminder_${hours}h`;
        const alreadySent = await db.query.messages.findFirst({
          where: and(
            eq(messages.bookingId, b.id),
            eq(messages.templateName, templateTag)
          ),
        });
        if (alreadySent) continue;

        const formUrl = `${process.env.NEXT_PUBLIC_APP_URL}/consent/${b.id}`;
        await sendConsentReminder(b, formUrl);
        await db
          .update(consentRecords)
          .set({
            reminderCount: sql`${consentRecords.reminderCount} + 1`,
            reminderSentAt: new Date(),
          })
          .where(eq(consentRecords.bookingId, b.id));

        await db.insert(messages).values({
          id: randomUUID(),
          bookingId: b.id,
          channel: "email",
          direction: "outbound",
          content: `Consent reminder: ${hours}h before`,
          templateName: templateTag,
        });

        results[templateTag] = (results[templateTag] ?? 0) + 1;
      } catch (err) {
        console.error("Consent reminder failed", b.id, err);
      }
    }
  }

  // 3. Balance overdue: unpaid balance > 7 days (Stage 8) with cooldown
  const overdueWindow = new Date(now.getTime() - 7 * 24 * 3600_000);
  const overdue = await db.query.bookings.findMany({
    where: and(
      inArray(bookings.stage, ["session_complete", "session_completed", "payment_pending"]),
      isNull(bookings.balancePaidAt),
      lte(bookings.completedAt!, overdueWindow)
    ),
    with: { client: true },
  });
  for (const b of overdue) {
    try {
      const balancePaise = b.balanceAmount ? Number(b.balanceAmount) : 0;
      if (balancePaise <= 0) continue;

      // Prevent notification spam: ensure at most 1 balance overdue reminder every 7 days
      const recentReminder = await db.query.messages.findFirst({
        where: and(
          eq(messages.bookingId, b.id),
          eq(messages.templateName, "balance_overdue_reminder"),
          gte(messages.createdAt, new Date(now.getTime() - 7 * 24 * 3600_000))
        ),
      });
      if (recentReminder) continue;

      const link = await createPaymentLink({
        amount: balancePaise,
        referenceId: b.id,
        description: `Balance for ${b.serviceType}`,
        customer: { name: b.client.name, email: b.client.email, contact: b.client.phone },
        expirySeconds: 7 * 24 * 3600,
      });
      await sendBalanceReminder(b, b.balanceAmount!, link.short_url);
      if (b.hubspotDealId) {
        await addNote(b.hubspotDealId, "Balance overdue reminder sent");
      }

      await db.insert(messages).values({
        id: randomUUID(),
        bookingId: b.id,
        channel: "email",
        direction: "outbound",
        content: `Balance overdue reminder: INR ${Math.round(balancePaise / 100)}`,
        templateName: "balance_overdue_reminder",
      });

      results.balance_overdue = (results.balance_overdue ?? 0) + 1;
    } catch (err) {
      console.error("Balance reminder failed", b.id, err);
    }
  }

  return NextResponse.json({ ok: true, results });
}
