# MeetPrerna v1 technical architecture

Document: Technical design and implementation plan  
Target: Tattoo booking and client management system  
Version: 1.1 (Booking as project container)  
Status: In review

## 1. Summary

The platform uses an entity-relational model centered on:
Customer -> Booking (Project Container) -> Sessions -> (Consent Records, Media Assets, Payments)

In this design, a booking is the creative tattoo project container and commercial agreement. Under each booking, dedicated relational tables manage:
1. Sessions: Studio appointments (for single-session or multi-session tattoos).
2. Media assets: Categorized images (references, designs, before photos, fresh tattoos, healed follow-ups, touch-ups).
3. Consent records: Signed legal documents with touchscreen signatures, health disclosures, separate photo and marketing permissions, and generated PDFs.
4. Payments: Razorpay deposit and balance transactions.

## 2. Deficiencies and resolutions

| Defect ID | Problem | Existing state | Target solution |
|---|---|---|---|
| CD-01 | No customer profile view | `clients` table exists, but there is no customer directory or profile page. Data is only accessible inside isolated booking records. | New routes: `/dashboard/customers` (directory searchable by name, email, and phone) and `/dashboard/customers/[id]` (full history of tattoo projects, sessions, lifetime spend, signed consent records, and photos). |
| CD-02 | No usable consent workflow | `consent_forms` exists, but `/consent/[bookingId]` uses a text input instead of a touch signature. Photo and marketing consent are combined. No PDF is generated. Sessions can start without consent. | New signature route at `/consent/[sessionId]` using HTML5 canvas pointer events, separate procedure, photo, and marketing consent toggles, PDF generation, and a dashboard check that prevents starting a session if unsigned. |
| CD-03 | No post-tattoo photo management | Only an uncategorized list of URLs (`reference_images`) on the booking record. No session association or category tagging. | Dedicated `media_assets` table and `/dashboard/gallery` view supporting multi-file uploads tagged with category (`reference`, `design`, `before`, `fresh`, `healed`, `touch_up`), booking ID, and session ID. |
| CD-04 | Missing WhatsApp notifications | Cloud API calls fail outside the 24-hour window when sending freeform text without approved templates. | Event-driven notification engine that logs triggers, dispatches approved templates where available, and provides a direct `wa.me` link with pre-filled text in the dashboard. |
| CD-05 | No artist-controlled calendar | `artist_availability` exists, but there is no calendar UI. Appointments are set by manually typing date strings in booking fields. | New route `/dashboard/calendar` with Month, Week, Day, and Agenda views. The artist manages sessions with conflict detection. Customers cannot self-book. |
| CD-06 | Missing submission date and time | Timestamps are stored in UTC in the database, but omitted or unformatted in dashboard tables and cards. | UTC and local studio time (IST) displayed across all dashboard views, accompanied by relative elapsed time ("Submitted 2 hours ago"). |

## 3. Entity-relational model

```
Customer (clients table)
  │
  ├── Booking (bookings table: Tattoo Project Container)
  │     ├── Creative Scope: Design description, placement, size, style, reference images
  │     ├── Commercial Terms: Quoted price, deposit amount, balance amount
  │     ├── Lifecycle Stage: 7-stage pipeline state
  │     │
  │     ├── Sessions (sessions table: 1-to-many physical appointments)
  │     │     ├── Session Number (e.g. Session 1 of 3)
  │     │     ├── Scheduled Start & End Timestamps
  │     │     ├── Status: scheduled | in_progress | completed | cancelled | rescheduled
  │     │     │
  │     │     └── Consent Record (consent_records table: 1-to-1 per session)
  │     │           ├── Legal Name, Date of Birth, Age Verification Check
  │     │           ├── Health Disclosures (Allergies, Skin/Blood Conditions)
  │     │           ├── Touchscreen Canvas Signature Data URL
  │     │           ├── Separate Photography Consent (Studio Archive)
  │     │           ├── Separate Marketing Consent (Social Media / Web)
  │     │           └── Downloadable Legal PDF URL
  │     │
  │     ├── Media Assets (media_assets table: 1-to-many)
  │     │     ├── URL & Storage Path
  │     │     ├── Category: reference | design | before | fresh | healed | touch_up
  │     │     └── Session Association (optional for initial references)
  │     │
  │     └── Payments (payments table: 1-to-many)
  │           └── Type (deposit | balance), Amount, Razorpay ID, Status
```

## 4. Booking lifecycle stages

The booking pipeline has seven sequential stages. Secondary requirements (consent, calendar, media, payments) are tracked as independent attributes.

### Primary stages

1. `new_enquiry`: Form received, submission timestamp logged, customer profile matched or created.
2. `consultation_review`: The artist evaluates the design concept, placement, sizing, and references, and records notes.
3. `deposit_pending`: Quote established and deposit payment link sent to the customer.
4. `confirmed_scheduled`: Deposit verified and appointment booked on the calendar.
5. `session_completed`: Digital consent verified, tattoo procedure completed, and fresh photos captured.
6. `payment_pending`: Final balance payment requested and tracked.
7. `closed_followup`: Balance settled, aftercare instructions sent, and 4-week healed photo follow-up scheduled.

### Independent attributes

- Consent status: `not_started`, `pending`, `signed`, or `overridden`. A session cannot move to `in_progress` or `session_completed` unless consent is `signed` or explicitly overridden with a recorded reason.
- Deposit status: `not_requested`, `pending`, `paid`, or `expired`.
- Balance status: `not_requested`, `pending`, `paid`, or `overdue`.
- Calendar status: `unscheduled`, `scheduled`, `rescheduled`, or `cancelled`.
- Follow-up status: `scheduled`, `sent`, `completed`, or `snoozed`.

## 5. Database schema (Drizzle ORM)

### 5.1 Updated `clients` table
```ts
// Existing clients table extended with profile analytics
export const clients = pgTable("clients", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 5.2 Updated `bookings` table
```ts
export const bookingStageEnum = pgEnum("booking_stage", [
  "new_enquiry",
  "consultation_review",
  "deposit_pending",
  "confirmed_scheduled",
  "session_completed",
  "payment_pending",
  "closed_followup",
]);

// Retained as Project Container
export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  artistId: text("artist_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceType: text("service_type").notNull().default("Tattoo"),
  designDescription: text("design_description"),
  placement: text("placement"),
  approximateSize: text("approximate_size"),
  style: text("style"),
  referenceImages: jsonb("reference_images").$type<string[]>().default([]),
  estimatedBudget: bigint("estimated_budget", { mode: "bigint" }),
  quotedAmount: bigint("quoted_amount", { mode: "bigint" }),
  stage: bookingStageEnum("stage").default("new_enquiry").notNull(),
  depositAmount: bigint("deposit_amount", { mode: "bigint" }),
  depositPaidAt: timestamp("deposit_paid_at", { withTimezone: true }),
  balanceAmount: bigint("balance_amount", { mode: "bigint" }),
  balancePaidAt: timestamp("balance_paid_at", { withTimezone: true }),
  consultationNotes: text("consultation_notes"),
  rejectionReason: text("rejection_reason"),
  hubspotDealId: text("hubspot_deal_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 5.3 New `sessions` table
```ts
export const sessionStatusEnum = pgEnum("session_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "rescheduled",
]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  sessionNumber: integer("session_number").default(1).notNull(),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").default(180).notNull(),
  status: sessionStatusEnum("status").default("scheduled").notNull(),
  notes: text("notes"),
  consentStatus: text("consent_status").default("not_started").notNull(), // not_started, pending, signed, overridden
  overrideReason: text("override_reason"),
  overrideByUserId: text("override_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 5.4 New `media_assets` table
```ts
export const mediaCategoryEnum = pgEnum("media_category", [
  "reference",
  "design",
  "before",
  "fresh",
  "healed",
  "touch_up",
]);

export const mediaAssets = pgTable("media_assets", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => sessions.id, { onDelete: "set null" }),
  url: text("url").notNull(),
  category: mediaCategoryEnum("category").notNull(),
  caption: text("caption"),
  consentForMarketing: boolean("consent_for_marketing").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 5.5 Upgraded `consent_records` table
```ts
export const consentRecords = pgTable("consent_records", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }).unique(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  legalName: text("legal_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  ageVerified: boolean("age_verified").notNull(),
  healthDisclosures: jsonb("health_disclosures").$type<{
    allergies: boolean;
    allergiesDetails?: string;
    bloodThinners: boolean;
    skinConditions: boolean;
    skinConditionsDetails?: string;
    pregnantOrNursing: boolean;
    cardiacOrEpileptic: boolean;
  }>().notNull(),
  procedureConsent: boolean("procedure_consent").notNull(),
  photographyConsent: boolean("photography_consent").notNull(),
  marketingConsent: boolean("marketing_consent").notNull(),
  signatureImageUrl: text("signature_image_url").notNull(),
  pdfUrl: text("pdf_url"),
  signerIp: text("signer_ip"),
  signerUserAgent: text("signer_user_agent"),
  signedAt: timestamp("signed_at", { withTimezone: true }).defaultNow().notNull(),
});
```

## 6. Screen architecture and navigation

The top navigation header in `src/app/dashboard/layout.tsx` includes:

`[Meet Prerna Logo]  Artist Studio  |  Overview  |  Bookings  |  Customers  |  Calendar  |  Gallery  |  Payments`

### 6.1 Customer directory and profile (`/dashboard/customers` and `/dashboard/customers/[id]`)
- Directory: Search across name, phone, email, and Instagram. Shows lifetime spend and total bookings.
- Customer profile:
  - Header with contact details, first visit date, total revenue, and WhatsApp link.
  - Project history with stage indicators.
  - Chronological list of attended studio sessions.
  - Document archive with links to signed consent PDFs.
  - Photo grid for references, fresh tattoos, and healed follow-ups.

### 6.2 iPad digital consent (`/consent/[sessionId]`)
- Signature pad: HTML5 canvas component handling pointer events (`pointerdown`, `pointermove`, `pointerup`), retina scaling, and stroke clearing.
- Form steps:
  1. Identity and birth date check (verifies 18+).
  2. Health disclosures (allergies, skin conditions, blood thinners).
  3. Risk and procedure acknowledgement.
  4. Separate permissions:
     - Procedure consent (mandatory).
     - Photography for studio records (optional).
     - Marketing and portfolio use on social media (optional).
  5. Touchscreen signature canvas.
- PDF generation: Assembles a document with timestamps, disclosures, and the signature image.
- Session protection: The dashboard checks consent status and prevents starting a session until signed or overridden with a recorded justification.

### 6.3 Tattoo photo management (`/dashboard/gallery`)
- Upload modal: Select category (`reference`, `design`, `before`, `fresh`, `healed`, `touch_up`), customer, and session.
- Dossier uploads: In `/dashboard/bookings/[id]`, photos can be dropped into fresh or healed photo slots.
- Gallery grid: Filterable by client, category, and date.

### 6.4 WhatsApp notifications
1. Trigger event occurs (such as booking confirmed, 48-hour reminder, or session completed).
2. The event is recorded in the `messages` table.
3. Notification engine formats the message text.
4. The dashboard displays a direct `wa.me` button, ensuring delivery even if Meta Cloud API has an expired 24-hour customer window.

### 6.5 Artist calendar (`/dashboard/calendar`)
- Views: Month, Week, Day, and Agenda.
- Actions:
  - Click any time slot to schedule a session.
  - Select an existing customer or add a new one.
  - Set start time, duration, and notes.
  - Overlap check detects conflicts and prompts for confirmation.
  - Customers cannot book or view slots.

### 6.6 Submission timestamps
- Formats:
  - Absolute: `format(createdAt, "d MMM yyyy, h:mm a")` (for example, `17 Nov 2026, 4:30 PM IST`).
  - Relative: `formatDistanceToNow(createdAt, { addSuffix: true })` (for example, `2 hours ago`).
- Displayed on enquiry cards, table rows, and dossier headers.

## 7. Implementation phases

1. Schema and migrations: Create `sessions`, `media_assets`, and updated `consent_records`. Run backfill for existing bookings with session dates.
2. State machine and API: Update `src/lib/state-machine.ts` to the 7-stage pipeline and update tests.
3. UI implementation: Build `/dashboard/customers`, `/dashboard/calendar`, `/dashboard/gallery`, and `/consent/[sessionId]`.
4. Verification: Run `bun test` and type checking.
