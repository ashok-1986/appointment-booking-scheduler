import { NextRequest, NextResponse } from "next/server";
import { getBooking, submitFeedback } from "@/lib/workflows";
import { jsonError, jsonOk } from "@/lib/route-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const booking = await getBooking(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const safeClient = booking.client
      ? {
          name: booking.client.name,
          email: booking.client.email,
        }
      : null;
    return jsonOk({
      ok: true,
      booking: {
        id: booking.id,
        client: safeClient,
        serviceType: booking.serviceType,
        completedAt: booking.completedAt,
        followUpRating: booking.followUpRating,
        followUpFeedback: booking.followUpFeedback,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const body = await req.json();
    const rating = Number(body.rating);
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { ok: false, error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }
    const result = await submitFeedback(
      bookingId,
      rating,
      body.feedback,
      body.healedPhotoUrl
    );
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return jsonOk({ ok: true, lowRating: result.lowRating });
  } catch (err) {
    return jsonError(err);
  }
}
