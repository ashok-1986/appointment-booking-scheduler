import { db } from "@/lib/db";
import {
  clients,
  bookings,
  bookingSessions,
  payments,
  mediaAssets,
  consentRecords,
  type Client,
} from "@/lib/schema";
import { eq, desc, ilike, or } from "drizzle-orm";

export type CustomerSummary = Client & {
  formattedTotalSpend: string;
  totalSpendNumber: number;
  latestBookingStage?: string;
  latestBookingDate?: Date | null;
  isRepeat: boolean;
};

export type CustomerProfile = {
  customer: Client;
  formattedTotalSpend: string;
  totalSpendNumber: number;
  bookings: Array<
    typeof bookings.$inferSelect & {
      sessions: (typeof bookingSessions.$inferSelect)[];
      payments: (typeof payments.$inferSelect)[];
    }
  >;
  mediaAssets: (typeof mediaAssets.$inferSelect)[];
  consentRecords: (typeof consentRecords.$inferSelect)[];
};

/**
 * Lists all customers with aggregated revenue, booking counts, and search filtering.
 */
export async function listCustomers(query?: string): Promise<{
  customers: CustomerSummary[];
  stats: {
    totalCustomers: number;
    repeatCustomers: number;
    totalLifetimeRevenue: number;
  };
}> {
  let allClients: Client[];

  if (query && query.trim()) {
    const term = `%${query.trim()}%`;
    allClients = await db
      .select()
      .from(clients)
      .where(
        or(
          ilike(clients.name, term),
          ilike(clients.email, term),
          ilike(clients.phone, term),
          ilike(clients.instagramHandle, term),
          ilike(clients.city, term)
        )
      )
      .orderBy(desc(clients.createdAt));
  } else {
    allClients = await db
      .select()
      .from(clients)
      .orderBy(desc(clients.createdAt));
  }

  // Pre-fetch bookings for all clients to compute fresh stats
  const allBookings = await db
    .select()
    .from(bookings)
    .orderBy(desc(bookings.createdAt));

  const allPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.status, "paid"));

  const customers: CustomerSummary[] = allClients.map((client) => {
    const clientBookings = allBookings.filter((b) => b.clientId === client.id);
    const clientPayments = allPayments.filter((p) =>
      clientBookings.some((b) => b.id === p.bookingId)
    );

    const totalPaise = clientPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );
    const totalRupees = Math.round(totalPaise / 100);

    const latestBooking = clientBookings[0];

    return {
      ...client,
      bookingsCount: clientBookings.length,
      totalSpend: BigInt(totalPaise),
      formattedTotalSpend: `₹${totalRupees.toLocaleString("en-IN")}`,
      totalSpendNumber: totalRupees,
      latestBookingStage: latestBooking?.stage,
      latestBookingDate: latestBooking?.createdAt,
      isRepeat: clientBookings.length > 1,
    };
  });

  const totalLifetimeRevenue = customers.reduce(
    (acc, c) => acc + c.totalSpendNumber,
    0
  );
  const repeatCustomers = customers.filter((c) => c.isRepeat).length;

  return {
    customers,
    stats: {
      totalCustomers: customers.length,
      repeatCustomers,
      totalLifetimeRevenue,
    },
  };
}

/**
 * Fetches the unified customer profile: past bookings, sessions, documents, and media.
 */
export async function getCustomerProfile(
  customerId: string
): Promise<CustomerProfile | null> {
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, customerId),
  });

  if (!client) return null;

  // Retrieve all bookings for this client
  const clientBookings = await db.query.bookings.findMany({
    where: eq(bookings.clientId, customerId),
    orderBy: [desc(bookings.createdAt)],
  });

  // For each booking, retrieve sessions and payments
  const enrichedBookings = await Promise.all(
    clientBookings.map(async (b) => {
      const [sessionsList, paymentsList] = await Promise.all([
        db.query.bookingSessions.findMany({
          where: eq(bookingSessions.bookingId, b.id),
          orderBy: [desc(bookingSessions.scheduledStart)],
        }),
        db.query.payments.findMany({
          where: eq(payments.bookingId, b.id),
          orderBy: [desc(payments.createdAt)],
        }),
      ]);

      return {
        ...b,
        sessions: sessionsList,
        payments: paymentsList,
      };
    })
  );

  // Retrieve media assets linked to client
  const clientMedia = await db.query.mediaAssets.findMany({
    where: eq(mediaAssets.clientId, customerId),
    orderBy: [desc(mediaAssets.createdAt)],
  });

  // Retrieve signed consent records linked to client
  const clientConsents = await db.query.consentRecords.findMany({
    where: eq(consentRecords.clientId, customerId),
    orderBy: [desc(consentRecords.signedAt)],
  });

  const allPayments = enrichedBookings.flatMap((b) => b.payments);
  const paidTotal = allPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalRupees = Math.round(paidTotal / 100);

  return {
    customer: client,
    formattedTotalSpend: `₹${totalRupees.toLocaleString("en-IN")}`,
    totalSpendNumber: totalRupees,
    bookings: enrichedBookings,
    mediaAssets: clientMedia,
    consentRecords: clientConsents,
  };
}

/**
 * Updates an artist's personal notes regarding a customer.
 */
export async function updateCustomerNotes(
  customerId: string,
  notes: string
): Promise<boolean> {
  await db
    .update(clients)
    .set({
      notes,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, customerId));

  return true;
}
