import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  pgEnum,
  uniqueIndex,
  index,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import { user, session, account, verification } from "./auth-schema";

export const bookingStageEnum = pgEnum("booking_stage", [
  "enquiry",
  "new_enquiry",
  "in_consultation",
  "consultation_review",
  "qualified",
  "not_a_fit",
  "deposit_requested",
  "deposit_pending",
  "deposit_paid",
  "scheduled",
  "confirmed_scheduled",
  "session_complete",
  "session_completed",
  "paid_in_full",
  "payment_pending",
  "follow_up_sent",
  "follow_up_completed",
  "closed_followup",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "rescheduled",
]);

export const mediaCategoryEnum = pgEnum("media_category", [
  "reference",
  "design",
  "before",
  "fresh",
  "healed",
  "touch_up",
]);

export const paymentTypeEnum = pgEnum("payment_type", ["deposit", "balance"]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "created",
  "paid",
  "failed",
  "expired",
  "refunded",
]);
export const messageChannelEnum = pgEnum("message_channel", ["whatsapp", "email"]);
export const messageDirectionEnum = pgEnum("message_direction", [
  "inbound",
  "outbound",
]);
export const userRoleEnum = pgEnum("user_role", ["artist", "studio_admin"]);

export const users = user;
export const sessions = session;
export const accounts = account;
export const verifications = verification;

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    instagramHandle: text("instagram_handle"),
    dateOfBirth: text("date_of_birth"),
    city: text("city"),
    notes: text("notes"),
    totalSpend: bigint("total_spend", { mode: "bigint" }).default(sql`0`),
    bookingsCount: integer("bookings_count").default(0),
    hubspotContactId: text("hubspot_contact_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("clients_email_unique").on(table.email),
    uniqueIndex("clients_phone_unique").on(table.phone),
    index("clients_hubspot_contact_id_idx").on(table.hubspotContactId),
  ]
);

export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    artistId: text("artist_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    serviceType: text("service_type").notNull(),
    designDescription: text("design_description"),
    placement: text("placement"),
    approximateSize: text("approximate_size"),
    style: text("style"),
    quotedAmount: bigint("quoted_amount", { mode: "bigint" }),
    referenceImages: jsonb("reference_images").$type<string[]>().default([]),
    preferredDateRangeStart: timestamp("preferred_date_range_start", {
      withTimezone: true,
    }),
    preferredDateRangeEnd: timestamp("preferred_date_range_end", {
      withTimezone: true,
    }),
    estimatedBudget: bigint("estimated_budget", { mode: "bigint" }),
    stage: bookingStageEnum("stage").default("enquiry").notNull(),
    depositAmount: bigint("deposit_amount", { mode: "bigint" }),
    depositPercentage: integer("deposit_percentage").default(30),
    depositPaidAt: timestamp("deposit_paid_at", { withTimezone: true }),
    balanceAmount: bigint("balance_amount", { mode: "bigint" }),
    balancePaidAt: timestamp("balance_paid_at", { withTimezone: true }),
    sessionDate: timestamp("session_date", { withTimezone: true }),
    sessionDuration: integer("session_duration"),
    sessionAddress: text("session_address"),
    preparationInstructions: text("preparation_instructions"),
    consentSignedAt: timestamp("consent_signed_at", { withTimezone: true }),
    consentFormId: text("consent_form_id"),
    hubspotDealId: text("hubspot_deal_id").unique(),
    consultationNotes: text("consultation_notes"),
    rejectionReason: text("rejection_reason"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    followUpSentAt: timestamp("follow_up_sent_at", { withTimezone: true }),
    followUpCompletedAt: timestamp("follow_up_completed_at", {
      withTimezone: true,
    }),
    followUpRating: integer("follow_up_rating"),
    followUpFeedback: text("follow_up_feedback"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bookings_client_id_idx").on(table.clientId),
    index("bookings_artist_id_idx").on(table.artistId),
    index("bookings_stage_idx").on(table.stage),
    index("bookings_hubspot_deal_id_idx").on(table.hubspotDealId),
    index("bookings_session_date_idx").on(table.sessionDate),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    type: paymentTypeEnum("type").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    currency: text("currency").default("INR").notNull(),
    status: paymentStatusEnum("status").default("created").notNull(),
    provider: text("provider").default("razorpay").notNull(),
    providerRef: text("provider_ref").notNull().unique(),
    providerPaymentId: text("provider_payment_id"),
    paymentMethod: text("payment_method"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    webhookPayload: jsonb("webhook_payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("payments_booking_id_idx").on(table.bookingId),
    index("payments_provider_ref_idx").on(table.providerRef),
    index("payments_status_idx").on(table.status),
  ]
);

export const consentForms = pgTable(
  "consent_forms",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" })
      .unique(),
    formData: jsonb("form_data").$type<Record<string, unknown>>(),
    signedData: jsonb("signed_data").$type<Record<string, unknown>>(),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    reminderCount: integer("reminder_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("consent_forms_booking_id_idx").on(table.bookingId),
    index("consent_forms_signed_at_idx").on(table.signedAt),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    channel: messageChannelEnum("channel").notNull(),
    direction: messageDirectionEnum("direction").notNull(),
    content: text("content").notNull(),
    templateName: text("template_name"),
    hubspotTimelineEventId: text("hubspot_timeline_event_id"),
    deliveryStatus: text("delivery_status"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("messages_booking_id_idx").on(table.bookingId),
    index("messages_created_at_idx").on(table.createdAt),
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_booking_id_idx").on(table.bookingId),
    index("audit_logs_user_id_idx").on(table.userId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ]
);

export const artistAvailability = pgTable(
  "artist_availability",
  {
    id: text("id").primaryKey(),
    artistId: text("artist_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    isRecurring: boolean("is_recurring").default(true).notNull(),
    exceptionDate: timestamp("exception_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("artist_availability_artist_id_idx").on(table.artistId),
    index("artist_availability_day_of_week_idx").on(table.dayOfWeek),
  ]
);

export const serviceTypes = pgTable("service_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  defaultDepositPercentage: integer("default_deposit_percentage")
    .default(30)
    .notNull(),
  defaultDurationMinutes: integer("default_duration_minutes"),
  basePrice: bigint("base_price", { mode: "bigint" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .unique(),
    role: userRoleEnum("role").default("artist").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("user_roles_user_id_idx").on(table.userId)]
);

export const bookingSessions = pgTable(
  "booking_sessions",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    sessionNumber: integer("session_number").default(1).notNull(),
    scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
    scheduledEnd: timestamp("scheduled_end", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").default(180).notNull(),
    status: sessionStatusEnum("status").default("scheduled").notNull(),
    notes: text("notes"),
    consentStatus: text("consent_status").default("not_started").notNull(),
    overrideReason: text("override_reason"),
    overrideByUserId: text("override_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("booking_sessions_booking_id_idx").on(table.bookingId),
    index("booking_sessions_scheduled_start_idx").on(table.scheduledStart),
    index("booking_sessions_status_idx").on(table.status),
  ]
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    bookingId: text("booking_id").references(() => bookings.id, {
      onDelete: "cascade",
    }),
    sessionId: text("session_id").references(() => bookingSessions.id, {
      onDelete: "set null",
    }),
    url: text("url").notNull(),
    category: mediaCategoryEnum("category").notNull(),
    caption: text("caption"),
    consentForMarketing: boolean("consent_for_marketing").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("media_assets_client_id_idx").on(table.clientId),
    index("media_assets_booking_id_idx").on(table.bookingId),
    index("media_assets_session_id_idx").on(table.sessionId),
    index("media_assets_category_idx").on(table.category),
  ]
);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").references(() => bookingSessions.id, {
      onDelete: "cascade",
    }),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    legalName: text("legal_name").notNull(),
    dateOfBirth: text("date_of_birth").notNull(),
    ageVerified: boolean("age_verified").notNull(),
    healthDisclosures: jsonb("health_disclosures").$type<{
      allergies?: boolean;
      allergiesDetails?: string;
      bloodThinners?: boolean;
      skinConditions?: boolean;
      skinConditionsDetails?: string;
      pregnantOrNursing?: boolean;
      cardiacOrEpileptic?: boolean;
    }>().notNull(),
    procedureConsent: boolean("procedure_consent").notNull(),
    photographyConsent: boolean("photography_consent").notNull(),
    marketingConsent: boolean("marketing_consent").notNull(),
    signatureImageUrl: text("signature_image_url").notNull(),
    pdfUrl: text("pdf_url"),
    signerIp: text("signer_ip"),
    signerUserAgent: text("signer_user_agent"),
    signedAt: timestamp("signed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("consent_records_session_id_idx").on(table.sessionId),
    index("consent_records_booking_id_idx").on(table.bookingId),
    index("consent_records_client_id_idx").on(table.clientId),
  ]
);

export const insertClientSchema = createInsertSchema(clients);
export const insertBookingSchema = createInsertSchema(bookings);
export const insertBookingSessionSchema = createInsertSchema(bookingSessions);
export const insertMediaAssetSchema = createInsertSchema(mediaAssets);
export const insertConsentRecordSchema = createInsertSchema(consentRecords);
export const insertPaymentSchema = createInsertSchema(payments);
export const insertConsentFormSchema = createInsertSchema(consentForms);
export const insertMessageSchema = createInsertSchema(messages);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertArtistAvailabilitySchema = createInsertSchema(
  artistAvailability
);
export const insertServiceTypeSchema = createInsertSchema(serviceTypes);
export const insertUserRoleSchema = createInsertSchema(userRoles);

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingSession = typeof bookingSessions.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type ConsentRecord = typeof consentRecords.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type ConsentForm = typeof consentForms.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ArtistAvailability = typeof artistAvailability.$inferSelect;
export type ServiceType = typeof serviceTypes.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;

export type NewClient = typeof clients.$inferInsert;
export type NewBooking = typeof bookings.$inferInsert;
export type NewBookingSession = typeof bookingSessions.$inferInsert;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;
export type NewConsentRecord = typeof consentRecords.$inferInsert;
export type NewPayment = typeof payments.$inferInsert;
export type NewConsentForm = typeof consentForms.$inferInsert;
export type NewMessage = typeof messages.$inferInsert;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type NewArtistAvailability = typeof artistAvailability.$inferInsert;
export type NewServiceType = typeof serviceTypes.$inferInsert;
export type NewUserRole = typeof userRoles.$inferInsert;

export const clientsRelations = relations(clients, ({ many }) => ({
  bookings: many(bookings),
  mediaAssets: many(mediaAssets),
  consentRecords: many(consentRecords),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  client: one(clients, {
    fields: [bookings.clientId],
    references: [clients.id],
  }),
  sessions: many(bookingSessions),
  payments: many(payments),
  mediaAssets: many(mediaAssets),
  consentRecords: many(consentRecords),
  messages: many(messages),
  consentForm: one(consentForms, {
    fields: [bookings.id],
    references: [consentForms.bookingId],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  booking: one(bookings, {
    fields: [messages.bookingId],
    references: [bookings.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

export const consentFormsRelations = relations(consentForms, ({ one }) => ({
  booking: one(bookings, {
    fields: [consentForms.bookingId],
    references: [bookings.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  booking: one(bookings, {
    fields: [auditLogs.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const bookingSessionsRelations = relations(
  bookingSessions,
  ({ one, many }) => ({
    booking: one(bookings, {
      fields: [bookingSessions.bookingId],
      references: [bookings.id],
    }),
    consentRecord: one(consentRecords, {
      fields: [bookingSessions.id],
      references: [consentRecords.sessionId],
    }),
    mediaAssets: many(mediaAssets),
  })
);

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  client: one(clients, {
    fields: [mediaAssets.clientId],
    references: [clients.id],
  }),
  booking: one(bookings, {
    fields: [mediaAssets.bookingId],
    references: [bookings.id],
  }),
  session: one(bookingSessions, {
    fields: [mediaAssets.sessionId],
    references: [bookingSessions.id],
  }),
}));

export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
  session: one(bookingSessions, {
    fields: [consentRecords.sessionId],
    references: [bookingSessions.id],
  }),
  booking: one(bookings, {
    fields: [consentRecords.bookingId],
    references: [bookings.id],
  }),
  client: one(clients, {
    fields: [consentRecords.clientId],
    references: [clients.id],
  }),
}));