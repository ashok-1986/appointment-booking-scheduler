import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { bookings } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function BookingRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const { id } = await params;
  const incomingParams = await searchParams;

  // Lookup the booking's client ID
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, id),
    columns: { id: true, clientId: true },
  });

  // Graceful error handling: redirect to bookings list with friendly toast rather than raw unstyled 404
  if (!booking) {
    redirect("/dashboard/bookings?error=booking_not_found");
  }

  // Preserve and forward all incoming query parameters (e.g. ?payment_status=success, ?source=email)
  const query = new URLSearchParams();
  query.set("bookingId", booking.id);

  for (const [key, val] of Object.entries(incomingParams)) {
    if (key !== "bookingId" && val !== undefined) {
      if (Array.isArray(val)) {
        val.forEach((v) => query.append(key, v));
      } else {
        query.set(key, val);
      }
    }
  }

  // Permanent server redirect to unified 3-column workspace with active project selected
  redirect(`/dashboard/customers/${booking.clientId}?${query.toString()}`);
}
