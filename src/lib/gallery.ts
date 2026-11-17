import { db } from "@/lib/db";
import {
  mediaAssets,
  clients,
  bookings,
  bookingSessions,
  type MediaAsset,
} from "@/lib/schema";
import { eq, and, desc, sql, or, ilike } from "drizzle-orm";
import { randomUUID } from "crypto";

export type MediaCategory =
  | "reference"
  | "design"
  | "before"
  | "fresh"
  | "healed"
  | "touch_up";

export const CATEGORY_META: Record<
  MediaCategory,
  {
    label: string;
    description: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
  }
> = {
  fresh: {
    label: "Fresh Tattoos",
    description: "Photographs taken immediately post-tattoo session in studio",
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-300 dark:border-emerald-800",
  },
  healed: {
    label: "Healed (Follow-ups)",
    description: "Follow-up photos after 4-8 weeks healing period",
    badgeBg: "bg-purple-500/10 dark:bg-purple-500/20",
    badgeText: "text-purple-700 dark:text-purple-300",
    borderColor: "border-purple-300 dark:border-purple-800",
  },
  reference: {
    label: "Reference Images",
    description: "Client inspiration photos, anatomical references & placement moodboards",
    badgeBg: "bg-blue-500/10 dark:bg-blue-500/20",
    badgeText: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-300 dark:border-blue-800",
  },
  design: {
    label: "Design Concepts",
    description: "Custom stencils, line-art flash concepts, and digital sketches",
    badgeBg: "bg-amber-500/10 dark:bg-amber-500/20",
    badgeText: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-300 dark:border-amber-800",
  },
  before: {
    label: "Before Session",
    description: "Skin preparation, stencil transfer & previous tattoo cover-up canvases",
    badgeBg: "bg-zinc-500/10 dark:bg-zinc-500/20",
    badgeText: "text-zinc-700 dark:text-zinc-300",
    borderColor: "border-zinc-300 dark:border-zinc-700",
  },
  touch_up: {
    label: "Touch-ups",
    description: "Secondary touch-up pass, refinement & pigment boost captures",
    badgeBg: "bg-[#C4FF61]/20 dark:bg-[#C4FF61]/25",
    badgeText: "text-[#1A1A1A] dark:text-[#C4FF61]",
    borderColor: "border-[#C4FF61]/60 dark:border-[#C4FF61]/40",
  },
};

export type MediaAssetWithDetails = {
  id: string;
  clientId: string;
  bookingId: string | null;
  sessionId: string | null;
  url: string;
  category: MediaCategory;
  caption: string | null;
  consentForMarketing: boolean;
  createdAt: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    instagramHandle: string | null;
  } | null;
  booking?: {
    id: string;
    serviceType: string;
    placement: string | null;
    designDescription: string | null;
  } | null;
  session?: {
    id: string;
    sessionNumber: number;
    scheduledStart: string;
    status: string;
  } | null;
};

export type CreateMediaAssetInput = {
  clientId: string;
  bookingId?: string | null;
  sessionId?: string | null;
  url: string;
  category: MediaCategory;
  caption?: string | null;
  consentForMarketing?: boolean;
};

/**
 * Defensive schema initialization in case migrations haven't run on the environment yet
 */
export async function ensureMediaTables(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "booking_sessions" (
        "id" text PRIMARY KEY NOT NULL,
        "booking_id" text NOT NULL REFERENCES "bookings"("id") ON DELETE cascade,
        "session_number" integer DEFAULT 1 NOT NULL,
        "scheduled_start" timestamp with time zone NOT NULL,
        "scheduled_end" timestamp with time zone NOT NULL,
        "duration_minutes" integer DEFAULT 180 NOT NULL,
        "status" text DEFAULT 'scheduled' NOT NULL,
        "notes" text,
        "consent_status" text DEFAULT 'not_started' NOT NULL,
        "override_reason" text,
        "override_by_user_id" text REFERENCES "user"("id") ON DELETE set null,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "media_assets" (
        "id" text PRIMARY KEY NOT NULL,
        "client_id" text NOT NULL REFERENCES "clients"("id") ON DELETE cascade,
        "booking_id" text REFERENCES "bookings"("id") ON DELETE cascade,
        "session_id" text REFERENCES "booking_sessions"("id") ON DELETE set null,
        "url" text NOT NULL,
        "category" text NOT NULL,
        "caption" text,
        "consent_for_marketing" boolean DEFAULT false NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
  } catch (err) {
    // Non-fatal if tables or enums already exist
    console.warn("ensureMediaTables info:", err);
  }
}

/**
 * Query media assets with client, booking, and session associations
 */
export async function listMediaAssets(filters?: {
  category?: string;
  clientId?: string;
  bookingId?: string;
  sessionId?: string;
  search?: string;
}): Promise<MediaAssetWithDetails[]> {
  try {
    await ensureMediaTables();

    // Query media assets with client joined
    let query = db
      .select({
        id: mediaAssets.id,
        clientId: mediaAssets.clientId,
        bookingId: mediaAssets.bookingId,
        sessionId: mediaAssets.sessionId,
        url: mediaAssets.url,
        category: mediaAssets.category,
        caption: mediaAssets.caption,
        consentForMarketing: mediaAssets.consentForMarketing,
        createdAt: mediaAssets.createdAt,
        clientName: clients.name,
        clientEmail: clients.email,
        clientPhone: clients.phone,
        clientInstagram: clients.instagramHandle,
        bookingServiceType: bookings.serviceType,
        bookingPlacement: bookings.placement,
        bookingDesignDescription: bookings.designDescription,
        sessionNumber: bookingSessions.sessionNumber,
        sessionStart: bookingSessions.scheduledStart,
        sessionStatus: bookingSessions.status,
      })
      .from(mediaAssets)
      .leftJoin(clients, eq(mediaAssets.clientId, clients.id))
      .leftJoin(bookings, eq(mediaAssets.bookingId, bookings.id))
      .leftJoin(bookingSessions, eq(mediaAssets.sessionId, bookingSessions.id))
      .orderBy(desc(mediaAssets.createdAt));

    const whereConditions = [];

    if (filters?.category && filters.category !== "all") {
      whereConditions.push(
        eq(mediaAssets.category, filters.category as MediaCategory)
      );
    }

    if (filters?.clientId && filters.clientId !== "all") {
      whereConditions.push(eq(mediaAssets.clientId, filters.clientId));
    }

    if (filters?.bookingId) {
      whereConditions.push(eq(mediaAssets.bookingId, filters.bookingId));
    }

    if (filters?.sessionId) {
      whereConditions.push(eq(mediaAssets.sessionId, filters.sessionId));
    }

    if (filters?.search && filters.search.trim()) {
      const s = `%${filters.search.trim()}%`;
      whereConditions.push(
        or(
          ilike(mediaAssets.caption, s),
          ilike(clients.name, s),
          ilike(bookings.placement, s)
        )
      );
    }

    let rows;
    if (whereConditions.length > 0) {
      rows = await query.where(and(...whereConditions));
    } else {
      rows = await query;
    }

    return rows.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      bookingId: r.bookingId,
      sessionId: r.sessionId,
      url: r.url,
      category: r.category as MediaCategory,
      caption: r.caption,
      consentForMarketing: Boolean(r.consentForMarketing),
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      client: r.clientId
        ? {
            id: r.clientId,
            name: r.clientName || "Unknown Client",
            email: r.clientEmail || "",
            phone: r.clientPhone || "",
            instagramHandle: r.clientInstagram || null,
          }
        : null,
      booking: r.bookingId
        ? {
            id: r.bookingId,
            serviceType: r.bookingServiceType || "Tattoo",
            placement: r.bookingPlacement || null,
            designDescription: r.bookingDesignDescription || null,
          }
        : null,
      session: r.sessionId
        ? {
            id: r.sessionId,
            sessionNumber: r.sessionNumber ?? 1,
            scheduledStart: r.sessionStart
              ? new Date(r.sessionStart).toISOString()
              : new Date().toISOString(),
            status: r.sessionStatus || "scheduled",
          }
        : null,
    }));
  } catch (err) {
    console.error("Error listing media assets:", err);
    return [];
  }
}

/**
 * Create a single media asset record
 */
export async function createMediaAsset(
  input: CreateMediaAssetInput
): Promise<MediaAsset> {
  await ensureMediaTables();

  const id = randomUUID();
  const [created] = await db
    .insert(mediaAssets)
    .values({
      id,
      clientId: input.clientId,
      bookingId: input.bookingId || null,
      sessionId: input.sessionId || null,
      url: input.url,
      category: input.category,
      caption: input.caption || null,
      consentForMarketing: Boolean(input.consentForMarketing),
      createdAt: new Date(),
    })
    .returning();

  return created;
}

/**
 * Create multiple media assets in batch
 */
export async function createMultipleMediaAssets(
  inputs: CreateMediaAssetInput[]
): Promise<MediaAsset[]> {
  if (inputs.length === 0) return [];
  await ensureMediaTables();

  const values = inputs.map((input) => ({
    id: randomUUID(),
    clientId: input.clientId,
    bookingId: input.bookingId || null,
    sessionId: input.sessionId || null,
    url: input.url,
    category: input.category,
    caption: input.caption || null,
    consentForMarketing: Boolean(input.consentForMarketing),
    createdAt: new Date(),
  }));

  const created = await db.insert(mediaAssets).values(values).returning();
  return created;
}

/**
 * Toggle marketing / social media consent
 */
export async function updateMediaAssetConsent(
  id: string,
  consentForMarketing: boolean
): Promise<{ ok: boolean }> {
  await ensureMediaTables();
  await db
    .update(mediaAssets)
    .set({ consentForMarketing })
    .where(eq(mediaAssets.id, id));
  return { ok: true };
}

/**
 * Delete a media asset
 */
export async function deleteMediaAsset(id: string): Promise<{ ok: boolean }> {
  await ensureMediaTables();
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  return { ok: true };
}

/**
 * Fetch simplified list of clients for selection filters and modals
 */
export async function getClientsForGallery(): Promise<
  Array<{ id: string; name: string; email: string; phone: string; instagramHandle: string | null }>
> {
  try {
    const list = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        instagramHandle: clients.instagramHandle,
      })
      .from(clients)
      .orderBy(clients.name);
    return list;
  } catch (err) {
    console.error("Error fetching clients for gallery:", err);
    return [];
  }
}

/**
 * Fetch all sessions and bookings for a specific client to populate dropdowns in upload modal
 */
export async function getClientSessionsAndBookings(clientId: string): Promise<{
  bookings: Array<{
    id: string;
    serviceType: string;
    placement: string | null;
    designDescription: string | null;
  }>;
  sessions: Array<{
    id: string;
    bookingId: string;
    sessionNumber: number;
    scheduledStart: string;
    durationMinutes: number;
    status: string;
    placement: string | null;
  }>;
}> {
  try {
    await ensureMediaTables();

    const clientBookings = await db
      .select({
        id: bookings.id,
        serviceType: bookings.serviceType,
        placement: bookings.placement,
        designDescription: bookings.designDescription,
      })
      .from(bookings)
      .where(eq(bookings.clientId, clientId))
      .orderBy(desc(bookings.createdAt));

    const bookingIds = clientBookings.map((b) => b.id);
    if (bookingIds.length === 0) {
      return { bookings: [], sessions: [] };
    }

    const sessionsList = await db
      .select({
        id: bookingSessions.id,
        bookingId: bookingSessions.bookingId,
        sessionNumber: bookingSessions.sessionNumber,
        scheduledStart: bookingSessions.scheduledStart,
        durationMinutes: bookingSessions.durationMinutes,
        status: bookingSessions.status,
        placement: bookings.placement,
      })
      .from(bookingSessions)
      .leftJoin(bookings, eq(bookingSessions.bookingId, bookings.id))
      .where(eq(bookings.clientId, clientId))
      .orderBy(desc(bookingSessions.scheduledStart));

    return {
      bookings: clientBookings,
      sessions: sessionsList.map((s) => ({
        id: s.id,
        bookingId: s.bookingId,
        sessionNumber: s.sessionNumber,
        scheduledStart: s.scheduledStart
          ? new Date(s.scheduledStart).toISOString()
          : new Date().toISOString(),
        durationMinutes: s.durationMinutes,
        status: s.status,
        placement: s.placement || null,
      })),
    };
  } catch (err) {
    console.error("Error fetching client sessions:", err);
    return { bookings: [], sessions: [] };
  }
}
