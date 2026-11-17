import { requireUser } from "@/lib/auth-utils";
import { getBooking, listMessages, listPayments } from "@/lib/workflows";
import BookingDetailClient from "./booking-detail-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { serializeBigInts } from "@/lib/route-utils";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const booking = await getBooking(id);

  if (!booking) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-20 text-center font-body">
          <p className="text-muted-foreground mb-4">Client booking not found or was removed.</p>
          <Link href="/dashboard/bookings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 size-4" /> Return to Bookings
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const [rawMessages, rawPayments] = await Promise.all([
    listMessages(id),
    listPayments(id),
  ]);

  const initialBooking = serializeBigInts(booking);
  const initialMessages = serializeBigInts(rawMessages);
  const initialPayments = serializeBigInts(rawPayments);

  return (
    <BookingDetailClient
      id={id}
      initialBooking={initialBooking as any}
      initialMessages={initialMessages as any}
      initialPayments={initialPayments as any}
    />
  );
}
