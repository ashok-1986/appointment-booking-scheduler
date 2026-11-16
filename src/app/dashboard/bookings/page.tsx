import { requireUser } from "@/lib/auth-utils";
import { listBookings } from "@/lib/workflows";
import BookingsClient from "./bookings-client";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  await requireUser();
  const rawBookings = await listBookings();
  const initialBookings = JSON.parse(
    JSON.stringify(rawBookings, (k, v) => (typeof v === "bigint" ? v.toString() : v))
  );

  return <BookingsClient initialBookings={initialBookings} />;
}
