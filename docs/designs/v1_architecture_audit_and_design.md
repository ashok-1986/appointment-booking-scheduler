# MeetPrerna V1 Architecture Specification & Technical Design
**Document:** Technical Design & Implementation Contract  
**Target:** MeetPrerna Tattoo Artist Booking & Client Management System  
**Version:** 1.1 (Agreed Architecture: Booking as Project Container)  
**Status:** In Review – Architectural Alignment Gate  

---

## 1. Executive Summary & Problem Formulation

The MeetPrerna platform is transitioning from a 12-stage linear pipeline to an entity-relational model centered on:
**Customer → Booking (Tattoo Project Container) → Sessions → (Consent Records / Media Assets / Payments)**

### Key Architectural Decision
Per consensus, `Booking` serves as the creative tattoo project container and commercial arrangement. Under each booking, dedicated relational tables manage:
1. **`sessions`**: Distinct physical studio appointments (supports single-session and multi-session tattoo projects).
2. **`media_assets`**: Categorized image repository (references, design concepts, before-session, fresh tattoos, healed follow-ups, touch-ups).
3. **`consent_records`**: Session-specific legal documents with iPad touch canvas signatures, health disclosures, separate photo/marketing permissions, and generated PDFs.
4. **`payments`**: Razorpay deposit and balance transactions.

This architecture preserves existing database integrity on Supabase, eliminates complex intermediate tables, and delivers solutions for all six confirmed deficiencies (CD-01 to CD-06).

---

## 2. Technical Audit & Resolution Matrix (CD-01 to CD-06)

| Defect ID | Defect Description | Existing Implementation State | Target V1 Solution |
|---|---|---|---|
| **CD-01** | No customer profile view | `clients` table exists, but no dedicated customer directory or profile pages exist. Data is only accessible inside isolated booking records. | New routes: `/dashboard/customers` (searchable directory by name, email, phone) and `/dashboard/customers/[id]` (complete history of all tattoo projects, sessions, lifetime spend, signed consent documents, and photo gallery). |
| **CD-02** | No usable customer consent workflow | `consent_forms` exists, but `/consent/[bookingId]` uses a text input instead of an iPad touch canvas signature. Photo and marketing consent are lumped together. No PDF generated. Sessions can be started without consent. | New iPad-optimized signature route at `/consent/[sessionId]` using HTML5 canvas pointer events, separate procedure/photo/marketing consent toggles, automated PDF document generation, and a hard dashboard gate preventing session start if unsigned. |
| **CD-03** | No post-tattoo image management | Only an un-categorized array of URLs (`reference_images`) on the booking record. No session association or category tagging. | Dedicated `media_assets` table and `/dashboard/gallery` view supporting multi-file uploads tagged with category (`reference`, `design`, `before`, `fresh`, `healed`, `touch_up`), booking ID, and session ID. |
| **CD-04** | Missing WhatsApp nudges | Cloud API calls fail outside the 24-hour customer window when sending freeform text without approved templates. | Event-driven notification engine that logs lifecycle triggers, dispatches approved templates where available, and provides Prerna with a guaranteed 1-click `wa.me` deep-link with pre-formatted text. |
| **CD-05** | No artist-controlled calendar experience | `artist_availability` exists, but no calendar user interface exists. Appointments are set by manually typing date strings in booking fields. | New route `/dashboard/calendar` offering Month, Week, Day, and Agenda views. Prerna manages sessions with conflict detection. Zero customer self-booking. |
| **CD-06** | Missing form submission date/time | Timestamps stored in UTC in the database, but omitted or unformatted in dashboard tables and cards. | Formatted UTC and local studio time (IST) displayed across all dashboard views, accompanied by relative elapsed time ("Submitted 2 hours ago"). |

---

## 3. Entity Relational Architecture

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

---

## 4. The 7-Stage Booking Lifecycle Specification

The booking pipeline is standardized into seven clear operational phases. Secondary requirements (Consent, Calendar, Media, Payments) operate as independent state attributes.

### Primary Lifecycle Stages

1. **`new_enquiry`**: Form received, submission timestamp logged, customer profile matched/created.
2. **`consultation_review`**: Prerna evaluates the design idea, placement, sizing, and references. Notes recorded.
3. **`deposit_pending`**: Quote established and deposit payment link dispatched to customer.
4. **`confirmed_scheduled`**: Deposit verified. Appointment booked on Prerna's calendar.
5. **`session_completed`**: Digital consent verified on iPad. Tattoo procedure completed. Fresh photos captured.
6. **`payment_pending`**: Final balance payment requested and tracked.
7. **`closed_followup`**: Balance settled. Aftercare instructions sent. 4-week healed photo follow-up scheduled.

### Independent Operational Attributes (Orthogonal to Pipeline)

- **Consent Status**: `not_started` | `pending` | `signed` | `overridden`
  - *Hard Invariant*: Session cannot transition to `in_progress` or `session_completed` unless Consent Status is `signed` (or explicitly overridden with an audit justification).
- **Deposit Status**: `not_requested` | `pending` | `paid` | `expired`
- **Balance Status**: `not_requested` | `pending` | `paid` | `overdue`
- **Calendar Status**: `unscheduled` | `scheduled` | `rescheduled` | `cancelled`
- **Follow-up Status**: `scheduled` | `sent` | `completed` | `snoozed`

---

## 5. Database Schema Specifications (Drizzle ORM)

### 5.1 Updated `clients` Table
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

### 5.2 Updated `bookings` Table (7 Stages + Container Attributes)
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

### 5.3 New `sessions` Table
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

### 5.4 New `media_assets` Table
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

### 5.5 Upgraded `consent_records` Table
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
  signatureImageUrl: text("signature_image_url").notNull(), // Data URL / stored PNG of iPad touch stroke
  pdfUrl: text("pdf_url"), // Generated legal PDF URL
  signerIp: text("signer_ip"),
  signerUserAgent: text("signer_user_agent"),
  signedAt: timestamp("signed_at", { withTimezone: true }).defaultNow().notNull(),
});
```

---

## 6. Screen Architecture & Dashboard Navigation

The top navigation header in `src/app/dashboard/layout.tsx` is updated to expose all six core operational areas:

```
[Meet Prerna Logo]  Artist Studio  |  Overview  |  Bookings  |  Customers  |  Calendar  |  Gallery  |  Payments
```

### 6.1 Customer Profile View (`/dashboard/customers` & `/dashboard/customers/[id]`) – CD-01
- **Directory**: Real-time search across customer name, phone, email, and Instagram. Shows lifetime spend and total bookings.
- **Dossier Detail**:
  - Header: Contact info, first visit date, total revenue, quick WhatsApp button.
  - Active & Past Bookings: Full project history with current stage badges.
  - Session Timeline: Chronological list of all studio sessions attended.
  - Documents Archive: Direct links to view/download signed consent PDFs.
  - Client Media: Chronological photo grid of references, fresh tattoos, and healed follow-ups.

### 6.2 iPad Touchscreen Digital Consent (`/consent/[sessionId]`) – CD-02
- **Touchscreen Canvas**: Custom `<SignaturePad>` component handling pointer events (`pointerdown`, `pointermove`, `pointerup`), retina scaling, and stroke clearing.
- **Form Steps**:
  1. Identity & DOB check (verifies 18+).
  2. Health Disclosures (allergies, skin conditions, blood thinners).
  3. Risk & Procedure Acknowledgement.
  4. Separate Permissions:
     - Checkbox A: Consent to tattoo procedure (Mandatory).
     - Checkbox B: Consent to photograph tattoo for studio records (Optional).
     - Checkbox C: Consent to use photographs on social media / marketing (Optional).
  5. Touchscreen Signature Canvas.
- **PDF Generation**: Client/server PDF assembler generating a signed document with exact timestamp, legal disclosures, and embedded signature graphic.
- **Session Protection**: The "Start Session" button in the booking dossier checks `consent_status`. If unsigned, a modal blocks the artist until signed or an explicit override reason is submitted.

### 6.3 Tattoo Media Management & Gallery (`/dashboard/gallery`) – CD-03
- **Upload Modal**: Select category (`reference`, `design`, `before`, `fresh`, `healed`, `touch_up`), customer, and session.
- **Direct Dossier Uploads**: In `/dashboard/bookings/[id]`, artists can drag and drop photos directly into the "Fresh Photos" or "Healed Photos" slots.
- **Gallery Grid**: Filterable by client, category, and date.

### 6.4 WhatsApp Lifecycle Trigger Engine – CD-04
- **Dual Dispatch Flow**:
  1. Trigger event occurs (e.g. Booking confirmed, Cron 48h, Session completed).
  2. Creates entry in `messages` table.
  3. Pre-formats approved message text.
  4. Provides artist with immediate 1-click `wa.me` button in the dashboard, ensuring delivery even if Meta Cloud API has an expired 24h window.

### 6.5 Artist-Controlled Calendar (`/dashboard/calendar`) – CD-05
- **Views**: Month, Week, Day, and Agenda views.
- **Interactive Actions**:
  - Click on time slot to create a new session.
  - Select customer from autocomplete dropdown or create new.
  - Set start time, duration, and tattoo project notes.
  - Overlap check detects conflicting appointments and warns the artist.
  - Customers have zero access to calendar slots.

### 6.6 Accurate Submission Timestamps – CD-06
- **Formatting Rule**:
  - Absolute: `format(createdAt, "d MMM yyyy, h:mm a")` (e.g., `17 Nov 2026, 4:30 PM IST`).
  - Relative: `formatDistanceToNow(createdAt, { addSuffix: true })` (e.g., `2 hours ago`).
  - Displayed prominently on all enquiry cards, table rows, and dossier headers.

---

## 7. Next Steps & Implementation Gate

To proceed safely with zero downtime:
1. **Step 1 (Schema & Migrations)**: Generate and run Drizzle migrations to create `sessions`, `media_assets`, and updated `consent_records`. Run backfill script creating an initial session for each existing booking with a `session_date`.
2. **Step 2 (State Machine & API Update)**: Update `src/lib/state-machine.ts` to the 7-stage pipeline and update tests.
3. **Step 3 (UI Implementation)**: Build `/dashboard/customers`, `/dashboard/calendar`, `/dashboard/gallery`, and `/consent/[sessionId]`.
4. **Step 4 (Verification)**: Run `bun test` and `tsc --noEmit`.
