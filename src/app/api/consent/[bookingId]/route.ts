import { NextRequest, NextResponse } from "next/server";
import { getBooking } from "@/lib/workflows";
import { jsonError } from "@/lib/route-utils";

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
    return NextResponse.json({
      booking: {
        client: booking.client,
        serviceType: booking.serviceType,
        consentSignedAt: booking.consentSignedAt,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
