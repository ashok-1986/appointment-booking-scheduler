import { redirect, notFound } from "next/navigation";
import { getBooking } from "@/lib/workflows";
import { requireUser } from "@/lib/auth-utils";

export default async function BookingRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const booking = await getBooking(id);

  if (!booking) {
    notFound();
  }

  // Redirect to the unified customer workspace containing this booking dossier
  redirect(`/dashboard/customers/${booking.clientId}?bookingId=${booking.id}`);
}
