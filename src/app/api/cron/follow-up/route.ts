import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@/lib/schema";
import { eq, and, lte, isNull, ne } from "drizzle-orm";
import { sendHealedPhotoFollowUp } from "@/lib/workflows";

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

  const results: Record<string, number> = {};
  const followUpDays = Number(process.env.FOLLOW_UP_DAYS ?? 30);
  const cutoff = new Date(Date.now() - followUpDays * 24 * 3600_000);

  // Sessions completed followUpDays ago that haven't had a follow-up yet
  const eligible = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.stage, "paid_in_full"),
        isNull(bookings.followUpSentAt),
        lte(bookings.completedAt!, cutoff)
      )
    );

  for (const b of eligible) {
    try {
      await sendHealedPhotoFollowUp(b.id);
      results.follow_up_sent = (results.follow_up_sent ?? 0) + 1;
    } catch (err) {
      console.error("Follow-up failed", b.id, err);
    }
  }

  return NextResponse.json({ ok: true, results });
}
