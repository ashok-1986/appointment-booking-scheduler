import { db } from "@/lib/db";
import {
  clients,
  bookings,
  bookingSessions,
  payments,
  mediaAssets,
  consentRecords,
  messages,
  type Client,
} from "@/lib/schema";
import { eq, desc, asc, ilike, or, inArray } from "drizzle-orm";

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

export interface UnifiedCustomerWorkspaceData {
  customer: Client;
  formattedTotalSpend: string;
  totalSpendNumber: number;
  bookings: Array<
    typeof bookings.$inferSelect & {
      sessions: (typeof bookingSessions.$inferSelect)[];
      payments: (typeof payments.$inferSelect)[];
      consentRecords: (typeof consentRecords.$inferSelect)[];
      mediaAssets: (typeof mediaAssets.$inferSelect)[];
    }
  >;
  sessions: Array<
    typeof bookingSessions.$inferSelect & {
      bookingId: string;
      serviceType: string;
      placement: string | null;
    }
  >;
  messages: (typeof messages.$inferSelect)[];
  mediaAssets: (typeof mediaAssets.$inferSelect)[];
  consentRecords: (typeof consentRecords.$inferSelect)[];
  allPayments: (typeof payments.$inferSelect)[];
}

/**
 * Single relational query engine that aggregates full client profile,
 * multi-project history, calendar sessions, media gallery, financial ledger,
 * and chronological messages without N+1 waterfalls.
 */
export async function getUnifiedCustomerWorkspaceData(
  customerId: string
): Promise<UnifiedCustomerWorkspaceData | null> {
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, customerId),
    with: {
      bookings: {
        orderBy: [desc(bookings.createdAt)],
        with: {
          sessions: {
            orderBy: [asc(bookingSessions.scheduledStart)],
          },
          payments: {
            orderBy: [desc(payments.createdAt)],
          },
          consentRecords: true,
          mediaAssets: true,
        },
      },
      mediaAssets: {
        orderBy: [desc(mediaAssets.createdAt)],
      },
      consentRecords: {
        orderBy: [desc(consentRecords.signedAt)],
      },
    },
  });

  if (!client) return null;

  // Fetch all messages across all client bookings (eliminating project scoping silos)
  const bookingIds = client.bookings.map((b) => b.id);
  const clientMessages =
    bookingIds.length > 0
      ? await db
          .select()
          .from(messages)
          .where(inArray(messages.bookingId, bookingIds))
          .orderBy(asc(messages.createdAt))
      : [];

  // Compute accurate lifetime spend from all settled payments
  const allPayments = client.bookings.flatMap((b) => b.payments);
  const paidTotalPaise = allPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalRupees = Math.round(paidTotalPaise / 100);

  // Flatten all sessions with project context for the right-column calendar
  const allSessions = client.bookings.flatMap((b) =>
    b.sessions.map((s) => ({
      ...s,
      bookingId: b.id,
      serviceType: b.serviceType,
      placement: b.placement,
    }))
  );

  return {
    customer: client,
    formattedTotalSpend: `₹${totalRupees.toLocaleString("en-IN")}`,
    totalSpendNumber: totalRupees,
    bookings: client.bookings,
    sessions: allSessions,
    messages: clientMessages,
    mediaAssets: client.mediaAssets,
    consentRecords: client.consentRecords,
    allPayments,
  };
}
