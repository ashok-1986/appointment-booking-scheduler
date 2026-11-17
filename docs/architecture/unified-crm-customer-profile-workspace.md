# Architectural Design & Implementation Specification Blueprint: Unified 3-Column CRM Customer Profile Workspace

**Document Version**: 1.0.0  
**Status**: APPROVED ARCHITECTURAL SPECIFICATION  
**Target Path**: `/dashboard/customers/[id]`  
**Target Redirect**: `/dashboard/bookings/[id]`  
**Date**: 2026-11-17  
**Author**: Teamwork Architectural Engineering Group  
**Classification**: Core Architecture / CRM & Pipeline Consolidation  

---

## Table of Contents
1. [Executive Summary & Architectural Philosophy](#1-executive-summary--architectural-philosophy)
2. [R1: Unified 3-Column CRM Profile Architecture](#2-r1-unified-3-column-crm-profile-architecture)
   - [2.1 Responsive Layout Grid Architecture](#21-responsive-layout-grid-architecture)
   - [2.2 Wireframe Layout & ASCII System Diagrams](#22-wireframe-layout--ascii-system-diagrams)
   - [2.3 Component Hierarchy & Panel Allocation](#23-component-hierarchy--panel-allocation)
   - [2.4 Luxury Studio Design System Integration](#24-luxury-studio-design-system-integration)
3. [R2: Direct In-Profile Embedding of Core Views](#3-r2-direct-in-profile-embedding-of-core-views)
   - [3.1 In-Profile Calendar & Upcoming Sessions](#31-in-profile-calendar--upcoming-sessions)
   - [3.2 In-Profile Media Gallery Archive](#32-in-profile-media-gallery-archive)
   - [3.3 Chronological Communication Timeline & Quick Composers](#33-chronological-communication-timeline--quick-composers)
   - [3.4 In-Profile Financial Ledger & Gateway Transactions](#34-in-profile-financial-ledger--gateway-transactions)
   - [3.5 In-Profile Digital Consent Records & Override Gate](#35-in-profile-digital-consent-records--override-gate)
4. [R3: Route Consolidation & Navigation Flow](#4-r3-route-consolidation--navigation-flow)
   - [4.1 URL Routing Specification & Multi-Project State](#41-url-routing-specification--multi-project-state)
   - [4.2 Server-Side Redirect Engine (`/dashboard/bookings/[id]`)](#42-server-side-redirect-engine-dashboardbookingsid)
   - [4.3 Pipeline Registry Link Migration (`/dashboard/bookings`)](#43-pipeline-registry-link-migration-dashboardbookings)
   - [4.4 Elimination of Circular Navigation](#44-elimination-of-circular-navigation)
5. [R4: Data Architecture, Schema Relationships & State Flow](#5-r4-data-architecture-schema-relationships--state-flow)
   - [5.1 Drizzle ORM Entity Mapping (8 Entities)](#51-drizzle-orm-entity-mapping-8-entities)
   - [5.2 Missing Drizzle Relations Specifications](#52-missing-drizzle-relations-specifications)
   - [5.3 Unified Data Fetching Engine (`getUnifiedCustomerWorkspaceData`)](#53-unified-data-fetching-engine-getunifiedcustomerworkspacedata)
   - [5.4 Server-to-Client Serialization Boundary & BigInt Safety](#54-server-to-client-serialization-boundary--bigint-safety)
   - [5.5 State Management, Multi-Project Switching & Optimistic Updates](#55-state-management-multi-project-switching--optimistic-updates)
6. [Step-by-Step Implementation Roadmap](#6-step-by-step-implementation-roadmap)
   - [Phase-by-Phase Execution Schedule](#phase-by-phase-execution-schedule)
   - [File-by-File Modification Inventory](#file-by-file-modification-inventory)
7. [Risk Assessment, Fallback Systems & Mitigations](#7-risk-assessment-fallback-systems--mitigations)
8. [Verification Protocol & Acceptance Criteria](#8-verification-protocol--acceptance-criteria)

---

## 1. Executive Summary & Architectural Philosophy

### 1.1 The "Dashboard Chaos" Problem
The existing appointment booking and customer management system suffers from fragmented, circular information architecture:
1. **Dossier Bifurcation**: The studio workflow is currently divided between `/dashboard/bookings/[id]` (the "Booking Dossier") and `/dashboard/customers/[id]` (the "Customer Dossier").
   - The Booking Dossier holds pipeline advancement, deposit links, calendar confirmations, and WhatsApp communications, but lacks customer lifetime context, multi-project history, notes, and media.
   - The Customer Dossier holds customer properties, past project lists, consent documents, and photo galleries, but cannot advance stages, create Razorpay links, or compose messages.
   - Studio artists must constantly click back and forth between these screens, creating cognitive fatigue and friction.
2. **Tab Fragmentation**: Studio staff must open `/dashboard/calendar` to inspect availability, `/dashboard/gallery` to upload fresh or healed photos, and `/dashboard/bookings` to inspect status.
3. **Circular Hyperlinks**: `booking-detail-client.tsx` has a link to `/dashboard/customers/[id]`, while `customer-dossier-client.tsx` contains links on every project and session card back to `/dashboard/bookings/[id]`.
4. **Data Query Inefficiency**: `getCustomerProfile()` executes an N+1 waterfall query via `Promise.all` across bookings to fetch sessions and payments, while messages remain unindexed by customer.

### 1.2 The HubSpot CRM Solution
To solve this fragmentation permanently, this architecture consolidates the entire client lifecycle into a unified **3-Column CRM Customer Profile Workspace** at `/dashboard/customers/[id]`, modeled after HubSpot’s contact record architecture:
- **Left Column (Context & Attributes — 25% width)**: Fixed customer identity, one-click quick action shortcuts (WhatsApp, Email, Call, Notes), "About this Client" attributes, pinned medical/aesthetic alerts, and private artist consultation notes.
- **Center Column (Action Workspace — 50% width)**: Primary working zone featuring the active tattoo project summary, canonical 7-stage visual pipeline progression bar, dynamic current stage action execution center, and chronological multi-channel communication timeline.
- **Right Column (Contextual Records — 25% width)**: Embedded secondary objects including project switchers, upcoming sessions with inline calendar scheduling, media gallery with in-profile upload, financial ledger with Razorpay tracking, and digital legal consent records with paper override gates.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 UNIFIED CUSTOMER WORKSPACE                                       │
│                                  /dashboard/customers/[id]                                       │
├───────────────────────────────┬──────────────────────────────────┬───────────────────────────────┤
│         LEFT COLUMN           │          CENTER COLUMN           │         RIGHT COLUMN          │
│    (Identity & Properties)    │       (Pipeline & Timeline)      │     (Contextual Objects)      │
│                               │                                  │                               │
│ • Client Monogram & Avatar    │ • Active Tattoo Project Header   │ • Tattoo Projects Switcher    │
│ • VIP / Repeat Status Badge   │ • 7-Stage Pipeline Progression   │ • Upcoming Sessions & Mini-Cal│
│ • Quick Actions (WA/Mail/Tel) │ • Current Stage Action Engine    │ • Embedded Media Gallery      │
│ • Pinned Medical/Skin Alerts  │ • Chronological Timeline Feed    │ • Financial & Payment Ledger  │
│ • "About this Client" Props   │ • Direct WhatsApp Web Composer   │ • Digital Consent Documents   │
│ • Private Artist Notes Editor │ • Message Templates Drawer       │ • Paper Override Verification │
└───────────────────────────────┴──────────────────────────────────┴───────────────────────────────┘
```

---

## 2. R1: Unified 3-Column CRM Profile Architecture

### 2.1 Responsive Layout Grid Architecture
The layout uses a CSS Grid and Flexbox system configured via Tailwind CSS across three responsive breakpoints, hardened with sticky viewport scroll isolation and responsive overflow protection:

| Viewport Breakpoint | Columns | Left Column Width | Center Column Width | Right Column Width | Layout & Scroll Behavior |
|---|---|---|---|---|---|
| **Desktop** (`>= 1280px` / `xl`, `2xl`) | 3 Columns | 3 cols (`25%`) | 6 cols (`50%`) | 3 cols (`25%`) | Side-by-side grid (`grid-cols-12 gap-6`). **Left column**: `col-span-12 md:col-span-4 xl:col-span-3 sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto pr-1 scrollbar-thin` for persistent, fully scrollable identity. **Center column**: `col-span-12 md:col-span-8 xl:col-span-6 space-y-6` with internal timeline scroll container (`max-h-[500px] overflow-y-auto pr-2 scrollbar-thin`). **Right column**: `col-span-12 xl:col-span-3 sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto pr-1 scrollbar-thin space-y-6` for independently scrollable contextual objects. |
| **Tablet** (`768px - 1279px` / `md`, `lg`) | 2 Columns | 4 cols (`33.3%`) | 8 cols (`66.7%`) | Sub-grid / Tabs | 2-column layout (`grid-cols-12 gap-6`). Uses Tailwind `md:` breakpoint (`col-span-12 md:col-span-4 xl:col-span-3` and `col-span-12 md:col-span-8 xl:col-span-6`) guaranteeing a true 2-column layout on standard tablet viewports (iPad portrait at 768px, 810px, 834px) rather than collapsing prematurely into single-column stacked mode. Left panel contains Identity, Properties, and Financial summary. Main panel contains Project Overview, Pipeline, Stage Actions, Timeline, with Right Column widgets (Sessions, Media, Consent) organized as tabbed cards below the timeline. |
| **Mobile** (`< 768px`) | 1 Column | 100% | 100% | 100% | Single-column stacked layout with persistent sticky top identity bar (Avatar, Name, Quick WA/Call shortcuts, Stage pill) and a 3-tab segmented navigation bar (`[Pipeline & Actions]`, `[Client Info]`, `[Sessions & Media]`). |

#### Sticky Viewport Constraints & Scroll Isolation Architecture
Standard laptop and desktop displays operate at 768px, 800px, or 900px vertical viewport height:
1. **Left Column Viewport Cutoff Prevention (Finding F1)**:
   - The Left Column content stack (Identity Card [~210px] + Quick Actions [~72px] + Pinned Alerts [~80px] + Client Properties [~310px] + Artist Private Notes [~230px] + 4 gaps [96px]) totals **998px**.
   - With `top-20` (80px top navbar offset), an 800px screen offers only 720px of visible height, cutting off the bottom 278px (the Private Notes textarea and Save button).
   - Enforcing `sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto pr-1 scrollbar-thin` bounds the Left Column to the available viewport window and renders an independent luxury scrollbar, ensuring complete accessibility to consultation notes on all screens.
2. **Center Column Timeline Scroll Isolation**:
   - As client communication accumulates (50+ WhatsApp and email touchpoints), an unbounded timeline can stretch the Center Column to over 4,000px, forcing full body scrolling that scrolls the shorter Right Column (~1,400px) entirely off-screen, creating large empty voids.
   - Bounding `CommunicationTimeline` with `max-h-[500px] overflow-y-auto pr-2 scrollbar-thin` isolates message scrolling inside its own card container, maintaining visual balance across all three columns.
3. **Narrow Desktop (1280px) Overflow Protection (Finding F2)**:
   - At 1280px (`xl`), after subtracting page padding (`p-6` = 48px) and grid gaps (`gap-6` = 48px), the net 12-column grid width is 1184px. Left and Right columns receive 296px gross (**264px net** after card padding `p-4`), while the Center Column receives 592px gross (**560px net**).
   - In the Right Column (264px net), a raw 6-column financial table averages only 44px/column. `FinancialSummaryCard` therefore specifies **stacked transaction cards** (or `overflow-x-auto` with sticky headers) to prevent text clipping.
   - In the Center Column (560px net), allocating 80px per stage on a 7-stage bar causes text collisions for 15-19 character stage labels. `PipelineProgressionBar` specifies **responsive step indicators** (rendering step numbers/icons with Radix Tooltips when container width < 700px) to prevent label clipping.

### 2.2 Wireframe Layout & ASCII System Diagrams

#### Desktop Wireframe (`>= 1280px`)
```
+-----------------------------------------------------------------------------------------------------------------------+
| TOP BAR: [<- Back to Customers]  |  Customer: Prerna Sharma [VIP Repeat Collector]  |  Quick Actions: [WA] [Mail] [Tel] [Note]|
+------------------------------------+---------------------------------------------------+------------------------------+
| LEFT COLUMN (col-span-12 md:col-4  | CENTER COLUMN (col-span-12 md:col-8 xl:col-span-6)| RIGHT COLUMN (col-span-12    |
| xl:col-span-3) sticky top-20       | space-y-6                                         | xl:col-span-3) sticky top-20 |
| max-h-[calc(100vh-5.5rem)]         |                                                   | max-h-[calc(100vh-5.5rem)]   |
| overflow-y-auto pr-1 scrollbar-thin|                                                   | overflow-y-auto pr-1 space-y-6|
+------------------------------------+---------------------------------------------------+------------------------------+
| [ IDENTITY CARD ]                  | [ ACTIVE PROJECT OVERVIEW ]                       | [ PROJECTS SWITCHER ]        |
| - Monogram Avatar (Electric Lime)  | - Project: Japanese Dragon Sleeve                 | - Active: Sleeve (Stage 4)   |
| - Prerna Sharma (Female, 28)       | - Style: Micro-Realism / Black & Grey             | - Past: Mini Lotus (Done)    |
| - Repeat Collector (2 Projects)    | - Placement: Left Outer Forearm (4x6 in)          | - [+ New Project]            |
| - Total Spend: INR 45,000          | - Quoted: INR 35,000 | Deposit: INR 10,500 (Paid) |------------------------------|
|------------------------------------|---------------------------------------------------| [ UPCOMING SESSIONS ]        |
| [ QUICK ACTION TOOLBAR ]           | [ 7-STAGE PIPELINE PROGRESSION BAR ]              | - Session 2 of 3             |
| [ WhatsApp ] [ Email ]             | (1)Enquiry -> (2)Consult -> (3)Deposit ->         | - Tomorrow, 2:00 PM (180 min)|
| [ Call ]     [ Note  ]             | (4)[CONFIRMED]* -> (5)Session -> (6)Balance ->    | - Consent: [SIGNED / VERIFIED|
|------------------------------------| (7)Follow-up [Responsive Tooltips when < 700px]   | - [Schedule New Session]     |
| [ PINNED ALERTS ]                  |---------------------------------------------------|------------------------------|
| ! Sensitive Skin (Lidocaine Alert) | [ CURRENT STAGE ACTION CENTER ]                   | [ MEDIA GALLERY ]            |
|------------------------------------| ACTIVE STAGE: CONFIRMED / SCHEDULED               | Tabs: [Ref(3)] [Fresh] [Heal]|
| [ "ABOUT THIS CLIENT" PROPERTIES ] | - Session locked for Nov 18, 2026                 | [Img1] [Img2] [Img3]         |
| • Phone: +91 98765 43210           | - Digital Consent: Signed & Verified              | - [+ Upload Photo]           |
| • Email: prerna@example.com        | - Pre-Session Prep Checklist: Dispatched          |------------------------------|
| • Instagram: @prerna_tattoos       | Actions:                                          | [ FINANCIAL SUMMARY ]        |
| • City: Mumbai, MH                 | [ Mark Session Complete & Trigger Aftercare ]     | - Total Quoted:  INR 35,000  |
| • Client Since: Jan 2025           | [ Reschedule Session ] [ Cancel Booking ]         | - Deposit Paid:  INR 10,500  |
| • Digital Consent: Validated       |---------------------------------------------------| - Balance Due:   INR 24,500  |
|------------------------------------| [ CHRONOLOGICAL COMMUNICATION TIMELINE ]          | - Stacked Cards / overflow-x |
| [ PRIVATE ARTIST NOTES ]           | Filter: [Active Project Only | All Client Projects] | - Razorpay: rzp_pay_9823 (Ok)|
| [Textarea: Prefers tea over coffee.| Channels: [All] [WhatsApp] [Email] [Notes]        |------------------------------|
|  Low pain threshold on inner wrist]| (Scroll Container: max-h-[500px] overflow-y-auto) | [ DIGITAL CONSENT RECORDS ]  |
| [ Save Notes (Auto-sync) ]         | • Today, 11:30 AM (Inbound WA)                    | - Form: Tattoo Waiver v2.1   |
| (Scrollable independently, never   |   "Hey! Just confirming directions to studio."    | - Signed: Nov 15, 2026       |
|  truncated on 768px-900px screens) | • Yesterday, 4:00 PM (Outbound Email)             | - Age 18+ Verified: YES      |
|                                    |   "Preparation Guide & Aftercare Instructions"    | - Signature: [Canvas Preview]|
|                                    | • Nov 15, 2026 (System Event)                     | - [View PDF] [Override Gate] |
|                                    |   "Deposit of INR 10,500 verified via Razorpay"   |                              |
|                                    |---------------------------------------------------|                              |
|                                    | [ QUICK INLINE WHATSAPP COMPOSER ]                |                              |
|                                    | [Type message or select template...             ] |                              |
|                                    | [Open wa.me] [Log to Timeline] [Send Cloud API]   |                              |
+------------------------------------+---------------------------------------------------+------------------------------+
```

#### Tablet Wireframe (`768px - 1279px` / `md` to `lg`)
```
+-----------------------------------------------------------------------------------------------+
| TOP BAR: [<- Customers] | Prerna Sharma | [WA] [Mail] [Tel] [Note]                            |
+----------------------------------------------+------------------------------------------------+
| LEFT PANEL (col-span-12 md:col-span-4)       | MAIN PANEL (col-span-12 md:col-span-8)         |
| max-h-[calc(100vh-5.5rem)] overflow-y-auto   | space-y-6                                      |
+----------------------------------------------+------------------------------------------------+
| [ IDENTITY & PROPERTIES CARD ]               | [ ACTIVE PROJECT OVERVIEW & 7-STAGE PIPELINE ] |
| - Avatar, Monogram, VIP Badge                | - Dragon Sleeve (4x6 in) | Quoted: INR 35,000  |
| - Contact: Phone, Email, Insta, City         | - Pipeline: [1]->[2]->[3]->[4(ACTIVE)]->[5]->..|
| - Total Spend: INR 45,000                    |------------------------------------------------|
| - Pinned Alert: Sensitive Skin               | [ CURRENT STAGE ACTION CARD ]                  |
| - Private Notes Editor (Scrollable)          | - Session Confirmed | Complete Session Button  |
|----------------------------------------------|------------------------------------------------|
| [ FINANCIAL SNAPSHOT ]                       | [ COMMUNICATION TIMELINE & COMPOSER ]          |
| - Quoted: INR 35,000                         | - Unified WA/Email feed with direct composer   |
| - Paid:   INR 10,500                         |------------------------------------------------|
| - Due:    INR 24,500                         | [ CONTEXTUAL TABS ACCORDION ]                  |
| - Ledger: Razorpay Transaction List          | [ Sessions (2) ] [ Gallery (6) ] [ Consent (1) ]|
|                                              | (Active tab expands embedded records below)    |
+----------------------------------------------+------------------------------------------------+
```

#### Mobile Wireframe (`< 768px`)
```
+-----------------------------------------------------------------------+
| [<-] Prerna Sharma   [Repeat Collector]   [WA] [Call]                 |
| Active: Dragon Sleeve • Stage: Confirmed Scheduled                    |
+-----------------------------------------------------------------------+
| SEGMENTED TABS: [ Pipeline & Actions ] [ Client Info ] [ Media & Cal ]|
+-----------------------------------------------------------------------+
| ACTIVE TAB: [ Pipeline & Actions ]                                    |
|                                                                       |
| [ 7-STAGE PIPELINE STEPPER ]                                          |
| (1) -> (2) -> (3) -> (4)* -> (5) -> (6) -> (7)                        |
|                                                                       |
| [ CURRENT STAGE ACTION CARD ]                                         |
| Session Confirmed: Tomorrow 2:00 PM                                   |
| [ Mark Session Complete ]                                             |
|                                                                       |
| [ COMMUNICATION TIMELINE ]                                            |
| • 11:30 AM WA Inbound: "Confirming studio directions..."              |
| • Yesterday Email: "Prep Guide sent"                                  |
|                                                                       |
| [ QUICK WHATSAPP BAR ]                                                |
| [Type quick response...] [Send wa.me]                                 |
+-----------------------------------------------------------------------+
```

### 2.3 Component Hierarchy & Panel Allocation

The component hierarchy is decomposed into modular, isolated files located in `src/components/dashboard/customer-workspace/`:

```
src/app/dashboard/customers/[id]/
├── page.tsx                                  # Server Component: auth, data fetching, serialization
└── customer-workspace-client.tsx             # Master Client Component: state, layout, responsiveness

src/components/dashboard/customer-workspace/
├── layout/
│   ├── workspace-header.tsx                  # Top breadcrumb, client name, VIP pill, top actions
│   ├── desktop-three-column.tsx              # 3-column desktop grid wrapper (sticky sidebars, max-h bounds, scroll isolation)
│   ├── tablet-two-column.tsx                 # 2-column tablet layout wrapper (md: breakpoint, tabbed contextual panel)
│   └── mobile-tabbed-view.tsx                # Single-column mobile tabbed wrapper (3-segment tabs)
├── left-column/
│   ├── customer-identity-card.tsx            # Avatar, monogram, VIP/Repeat status, lifecycle badge
│   ├── quick-actions-toolbar.tsx             # 4 quick action buttons (WhatsApp, Email, Call, Notes)
│   ├── pinned-alerts-banner.tsx              # Medical allergies, skin conditions, aesthetic cautions
│   ├── client-properties-card.tsx            # "About this Client" attributes (Phone, Email, Insta, City, DOB)
│   └── artist-private-notes.tsx              # Private consultation notes textarea with auto-sync (scroll-isolated)
├── center-column/
│   ├── active-project-header.tsx             # Active tattoo project details, placement, size, quoted amount
│   ├── no-active-project-card.tsx            # Empty state card when client has 0 bookings or active project is null
│   ├── pipeline-progression-bar.tsx          # Canonical 7-stage visual pipeline tracker (responsive tooltips when < 700px)
│   ├── current-stage-action-card.tsx         # Dynamic stage action center (actions 1 through 7)
│   ├── communication-timeline.tsx            # Merged WhatsApp + Email chronological feed (max-h-[500px] scroll container, project filter toggle)
│   └── quick-whatsapp-composer.tsx           # wa.me link, timeline logger, and Cloud API dispatcher
├── right-column/
│   ├── tattoo-projects-switcher.tsx          # Multi-project selector card with "+ New Project" CTA
│   ├── upcoming-sessions-card.tsx            # Sessions mini-calendar list + inline scheduling trigger
│   ├── embedded-media-gallery.tsx            # Reference, Fresh, Healed tabs + inline uploader trigger
│   ├── financial-summary-card.tsx            # Quoted, Deposit, Balance + stacked transaction cards / overflow-x-auto
│   └── digital-consent-card.tsx              # Executed legal waivers, age verification, paper override trigger
└── modals/
    ├── schedule-session-modal.tsx            # Inline session scheduler (reusing calendar conflict checks)
    ├── upload-media-modal.tsx                # Multi-photo uploader with category & marketing consent
    ├── log-call-modal.tsx                    # Call outcome logger and call notes recorder
    ├── send-email-modal.tsx                  # Email composer with studio templates
    ├── paper-consent-override-modal.tsx      # Physical waiver justification dialog
    └── image-lightbox-modal.tsx              # High-resolution media zoom & metadata inspection
```

### 2.4 Luxury Studio Design System Integration
All components adhere to the luxury studio theme (`design-system/meet-prerna-studio/MASTER.md`):

1. **Typography**:
   - Primary Headings & Client Identity: `Cormorant Garamond` serif (`font-cormorant`, `font-heading`, `tracking-tight`).
   - Body & UI Controls: `Montserrat` sans-serif (`font-montserrat`, `font-body`).
   - Numerical Currency, Durations & Timestamps: `Geist Mono` (`font-mono`).
2. **Color Palette & Visual Tokens**:
   - Dark Studio Noir: `#1A1A1A` (`--color-brand-bg`), `#000000` (`--color-background`), `dark:bg-zinc-950`.
   - Brand Primary Accent: `#C4FF61` (Electric Lime, `--color-brand-primary`). Used for active pipeline step pulses, VIP badges (`bg-[#C4FF61] text-[#1A1A1A]`), primary action buttons, and active project indicator borders.
   - Brand Secondary Accent: `#EAFF27` (`--color-brand-secondary`).
   - WhatsApp Brand Emerald: `#25D366` for direct WhatsApp links and chat bubbles.
   - Status Badges:
     - Verified / Paid: `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30`.
     - In Consultation / Pending: `bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30`.
     - High-Priority Alert / Override: `bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30`.
3. **Card Styling**:
   - Rounded corners: `rounded-xl` (`--radius: 0.625rem`).
   - Borders: Subtle hairline borders `border-zinc-200 dark:border-zinc-800`.
   - Subtle depth: `shadow-sm hover:shadow-md transition-all duration-200`.

---

## 3. R2: Direct In-Profile Embedding of Core Views

### 3.1 In-Profile Calendar & Upcoming Sessions
Instead of requiring staff to leave the customer profile to open `/dashboard/calendar`, the Right Column directly embeds the `UpcomingSessionsCard`:
- **Session Display**:
  - Displays each session linked to the client's projects (`booking_sessions` entity):
    - Session ordinal number (e.g., "Session 1 of 2", "Session 2 of 2").
    - Scheduled date, start time, end time, and duration in minutes.
    - Status badge: `Scheduled`, `In Progress`, `Completed`, `Cancelled`, `Rescheduled`.
    - Legal consent status badge: `Consent Signed` (emerald check) vs `Consent Pending` (amber warning).
- **Inline Session Scheduling**:
  - Clicking "Schedule Session" opens `ScheduleSessionModal` directly within the workspace.
  - Reuses the availability logic from `src/app/dashboard/calendar/page.tsx`:
    - Checks conflicting sessions in `booking_sessions` for the requested date/time slot.
    - Allows selecting the associated tattoo project (`bookingId`).
    - Submits to `POST /api/calendar/sessions` or `POST /api/bookings/[id]/confirm-session`.
    - Automatically syncs with Google Calendar via `createSessionEvent` and creates an audit log entry.
    - Optimistically appends the scheduled session to the `UpcomingSessionsCard` without page reload.

### 3.2 In-Profile Media Gallery Archive
Instead of forcing navigation to `/dashboard/gallery`, the Right Column embeds the `EmbeddedMediaGallery`:
- **Categorized Tabs**:
  - `Reference Art`: Images submitted by the client during intake (`bookings.referenceImages` and `media_assets` with `category = 'reference'`).
  - `Design Concepts`: Stencils, flash drafts, and digital placement mockups (`category = 'design'`).
  - `Fresh Studio Shots`: High-resolution photographs captured immediately post-session (`category = 'fresh'`).
  - `Healed Follow-ups`: Photos submitted by the client after 3-8 weeks of healing (`category = 'healed'`).
  - `Touch-ups` & `Before`: Pre-session skin preparation and touch-up passes (`category = 'touch_up' | 'before'`).
- **Inline File Uploader**:
  - Includes a prominent `[+ Upload Media]` button triggering `UploadMediaModal`.
  - Artists drag-and-drop or select photos directly from studio devices.
  - Form controls:
    - Target project selection (`bookingId`).
    - Associated session selection (`sessionId`).
    - Media Category selector dropdown (`fresh`, `healed`, `reference`, `design`, `before`, `touch_up`).
    - Marketing & Social Media Consent toggle switch (`consentForMarketing: boolean`).
    - Caption text field.
  - Submits multipart form data to `POST /api/gallery`.
  - Instantly refreshes the gallery grid in the Right Column.
- **Lightbox Preview**:
  - Clicking any thumbnail opens `ImageLightboxModal` with high-resolution inspection, zoom, category tag, and date captured.

### 3.3 Chronological Communication Timeline & Quick Composers
The Center Column features a unified, bi-directional communication stream (`CommunicationTimeline`) that aggregates all interactions across the client’s journey:
- **Timeline Feed Capabilities**:
  - **Internal Scroll Isolation (Challenger 1 Finding F1)**:
    - Bounded with `max-h-[500px] overflow-y-auto pr-2 scrollbar-thin` to isolate scrolling inside its card container.
    - Prevents 50+ messages from expanding the browser viewport to 4000px, which would scroll the Right Column entirely out of view and leave empty voids in the layout.
  - **Project Scope Filter Toggle (Reviewer 1 & 2 Finding)**:
    - Provides a dedicated scoping toggle: `[Active Project Only]` vs `[All Client Projects]` (defaulting to `[Active Project Only]`).
    - For repeat clients with multiple historical projects over years, `[Active Project Only]` restricts the feed to `messages.bookingId === activeBooking.id`, keeping artist focus concentrated on the immediate tattoo in progress.
    - Switching to `[All Client Projects]` exposes the entire client relationship history across all past bookings, decorating each message with a compact project indicator pill (e.g. `[Lotus Sleeve 2024]`).
  - **Multi-Channel Aggregation**: Displays WhatsApp messages, emails, logged phone calls, and internal studio notes in exact chronological sequence (`createdAt desc` or `asc`).
  - **Direction Badges**:
    - `Inbound` (Client -> Studio): Styled with emerald accent border and left-aligned speech bubble.
    - `Outbound` (Studio -> Client): Styled with dark studio noir background and right-aligned bubble.
    - `System / Gateway Event`: Centered neutral badge (e.g., "Razorpay Payment of ₹10,500 Confirmed", "Digital Waiver Signed").
  - **Channel Filter Tabs**: `[All Touchpoints]`, `[WhatsApp]`, `[Email]`, `[Calls & Notes]`.
- **Quick Action Composer & Triple Dispatch Strategy**:
  Located directly at the bottom of the timeline, the `QuickWhatsAppComposer` solves real-world studio operational constraints by providing three execution paths:
  1. **Direct WhatsApp Web / App Launch (`wa.me`)**:
     - Instant deep-link `https://wa.me/{cleanPhone}?text={encodedMessage}`.
     - Guarantees immediate zero-delay message dispatch even if Meta Cloud API keys are unconfigured or failing.
  2. **Timeline Logging ("Log to Timeline")**:
     - Submits to `POST /api/bookings/[id]/whatsapp` with payload `{ message: text, logOnly: true }`.
     - Logs the conversation into the PostgreSQL `messages` table and HubSpot contact timeline without sending duplicate external messages.
  3. **Official Meta Cloud API Dispatch ("Send via Cloud API")**:
     - Submits to `POST /api/bookings/[id]/whatsapp` with payload `{ message: text }`.
     - Invokes `sendWhatsAppText()` in `src/lib/services/whatsapp.ts` via Meta Graph API v18.0.
  - **API Return Contract (Challenger 2 Finding 1)**:
    - The backend route `/api/bookings/[id]/whatsapp` responds with `{ ok: true, data: newMessage }` returning the complete persisted `messages` record (including database UUID `id`, `createdAt`, `deliveryStatus`).
    - This allows the client optimistic state machine to smoothly reconcile temporary `opt-...` IDs with persisted server UUIDs without race conditions or ghost messages.
- **Pre-configured Studio Message Templates**:
  A template drawer provides 1-click text insertion for:
  - *Enquiry Received & Portfolio Sharing*
  - *Consultation Slot Proposal*
  - *Deposit Payment Request (with dynamic link)*
  - *Session Preparation & Studio Etiquette*
  - *Digital Consent Form Link Reminder*
  - *Aftercare Instructions & Cream Recommendations*
  - *3-Week Healed Photo Submission Request*

### 3.4 In-Profile Financial Ledger & Gateway Transactions
The Right Column houses the `FinancialSummaryCard`, giving artists and studio managers complete revenue visibility:
- **High-Level Financial Metrics**:
  - **Total Lifetime Spend**: Computed across all historical projects (`SUM(payments.amount WHERE status = 'paid')`).
  - **Active Project Quoted Amount**: `bookings.quotedAmount` in ₹ INR.
  - **Deposit Amount & Status**: `bookings.depositAmount` (with "Paid on [Date]" or "Pending" badge).
  - **Remaining Balance Due**: Calculated as `quotedAmount - depositAmount` (with "Settled" or "Unpaid" badge).
- **Narrow Desktop (1280px) Overflow Protection (Challenger 1 Finding F2)**:
  - On a 1280px desktop screen (`xl` breakpoint), the Right Column net width is **264px** after card padding (`p-4`).
  - A traditional 6-column table (`Date`, `Type`, `Amount`, `Provider Ref`, `Method`, `Status`) averages only 44px per column, causing severe text truncation or column squeezing.
  - `FinancialSummaryCard` implements a **responsive stacked transaction cards layout** (with optional `overflow-x-auto` table view on `2xl` screens >= 1536px):
    - **Card Row 1**: Date & Time (Geist Mono), Type badge (`Deposit` 30% / `Balance` 70%), formatted Amount (`₹10,500`), and Status chip (`Paid` [emerald] / `Pending` [amber]).
    - **Card Row 2**: Gateway Provider Reference (`rzp_pay_9823...`), Payment Method (`UPI` / `Card`), and copy transaction reference shortcut.
  - This guarantees clear, legible financial audit trails even on narrow 1280px displays without horizontal scrollbars breaking the column structure.
- **Payment Gateway Ledger**:
  - Interactive list of all `payments` records:
    - Date and time.
    - Type: `Deposit` (30%) or `Balance` (70%).
    - Amount: Formatted in ₹ INR.
    - Gateway Provider Reference: Razorpay Payment Link ID (`providerRef`) or Payment ID (`providerPaymentId`).
    - Payment Method: `UPI`, `Credit/Debit Card`, `Netbanking`.
    - Status Badge: `Paid` (emerald), `Created` (amber), `Failed` (rose), `Expired` (zinc).
  - Action button: "Generate Razorpay Link" or "Record Cash/Studio Settlement".

### 3.5 In-Profile Digital Consent Records & Override Gate
The Right Column integrates the `DigitalConsentCard`, ensuring strict compliance with studio legal requirements:
- **Consent Waiver Inspection**:
  - Renders all executed legal waivers from `consent_records`:
    - Full legal name and verified date of birth.
    - Age Verification Check: Confirmed 18+ requirement.
    - Health & Medical Disclosures: Allergies, blood thinners, skin conditions (eczema, psoriasis), cardiac conditions, epilepsy, pregnancy/nursing.
    - Consent flags: Procedure Consent, Photography Consent, Marketing Consent.
    - Digital Signature Canvas Preview: Rendered directly from `signatureImageUrl` data URL.
    - Attestation details: Signer IP address, User Agent, and timestamp.
    - Link to downloadable legal PDF waiver.
- **Mandatory Physical Paper Consent Override Gate**:
  - Under studio operating procedures (`src/lib/workflows/index.ts:685-749`), an artist **cannot mark a tattoo session complete** unless digital consent is signed or a valid physical override is supplied.
  - If a client signed a physical paper waiver in the studio, clicking "Override Consent" opens `PaperConsentOverrideModal`:
    - Requires artist to enter an `overrideReason` (e.g., "Physical waiver signed in studio due to client phone battery depletion; archived in file binder #A12").
    - Submits to `POST /api/bookings/[id]/complete` with `{ consentOverrideReason }`.
    - Automatically logs an immutable `session.consent_override` event into `audit_logs` with actor ID and reason.

---

## 4. R3: Route Consolidation & Navigation Flow

### 4.1 URL Routing Specification & Multi-Project State
The unified CRM customer profile workspace resides canonically at:
```
/dashboard/customers/[id]
```
To support repeat clients with multiple tattoo projects seamlessly, the workspace supports an optional query parameter:
```
/dashboard/customers/[id]?bookingId=[bookingId]
```
- When `bookingId` is present in the URL, the workspace initializes with that specific tattoo project selected as the active project in the Center Column.
- When `bookingId` is omitted, the workspace defaults to the client's **latest active booking** (the most recent booking where stage is not `closed_followup`, `not_a_fit`, or `cancelled`). If all bookings are completed, it defaults to the most recent booking.

#### Zero-Booking Client & Null Safety Guard (Challenger 1 Finding F6 & Reviewer 1/2)
In scenarios where a client is created as an initial CRM intake lead before an appointment/project is logged (`bookings.length === 0`), or if a stale/tampered `bookingId` query parameter is provided:
1. **Defensive Fallback Resolution**:
   In `CustomerWorkspaceClient`, the active booking is computed using defensive cascading fallbacks:
   ```typescript
   const activeBooking =
     bookings.find((b) => b.id === activeBookingId) ||
     bookings.find((b) => !isTerminal(b.stage)) ||
     bookings[0] ||
     null;
   ```
2. **Center Column Empty State (`NoActiveProjectCard`)**:
   - If `activeBooking === null` (or `bookings.length === 0`), the Center Column does not crash with a fatal `TypeError: Cannot read properties of undefined (reading 'stage')`.
   - Instead, the Center Column conditionally swaps out the active project header, pipeline bar, and stage action center for a dedicated luxury empty state component (`no-active-project-card.tsx`):
     - **Header**: "No Active Tattoo Projects"
     - **Description**: "This client profile does not have an active tattoo project yet. Create a new project to start tracking the 7-stage pipeline, calendar sessions, and payments."
     - **Action CTA**: `[+ Create New Project]` button which opens a project creation dialog or intake flow.
   - The Left Column (Identity, Contact Properties, Private Notes) and Right Column (Media Gallery, Notes) remain fully functional and interactive.

### 4.2 Server-Side Redirect Engine (`/dashboard/bookings/[id]`)
To completely eliminate the old Booking Dossier while maintaining 100% backwards compatibility for existing bookmarks, emails, or webhook callbacks, `src/app/dashboard/bookings/[id]/page.tsx` is converted into an efficient server-side redirect:

#### Query Parameter Preservation & Error Handling (Challenger 1 Findings F4 & F5)
1. **Preserving Incoming Query Parameters (Finding F4)**:
   Any inbound query parameters (such as `?payment_status=success` from Razorpay callbacks, `?session=2`, or `?source=email`) must be preserved and forwarded during the redirect hop rather than stripped.
2. **Graceful Handling of Invalid IDs (Finding F5)**:
   Because the project does not have a custom `not-found.tsx` at the root or dashboard level, invoking Next.js's raw `notFound()` renders an unstyled 404 screen that destroys the dashboard navbar and shell. Instead, invalid or archived booking IDs gracefully redirect to `/dashboard/bookings?error=booking_not_found`, where `bookings-client.tsx` triggers a friendly toast alert while preserving the full dashboard layout shell.

```typescript
// src/app/dashboard/bookings/[id]/page.tsx
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
```

### 4.3 Pipeline Registry Link Migration (`/dashboard/bookings`)
In `src/app/dashboard/bookings/bookings-client.tsx`, links pointing to `/dashboard/bookings/${b.id}` are updated so that staff clicking a booking card are routed directly to the unified customer profile without triggering an unnecessary server-side HTTP redirect hop:

1. **Line 710 (Client Name & Heading Link)**:
   ```tsx
   // Before:
   <Link href={`/dashboard/bookings/${b.id}`} ...>
     {b.client.name}
   </Link>

   // After:
   <Link href={`/dashboard/customers/${b.clientId}?bookingId=${b.id}`} ...>
     {b.client.name}
   </Link>
   ```

2. **Line 869 ("Manage Dossier" Action Button)**:
   ```tsx
   // Before:
   <Link href={`/dashboard/bookings/${b.id}`}>
     <Button size="sm" ...>
       <span>Manage Dossier</span>
       <ArrowRight className="size-3.5" />
     </Button>
   </Link>

   // After:
   <Link href={`/dashboard/customers/${b.clientId}?bookingId=${b.id}`}>
     <Button size="sm" ...>
       <span>Manage Dossier</span>
       <ArrowRight className="size-3.5" />
     </Button>
   </Link>
   ```

### 4.4 Elimination of Circular Navigation
In the existing `customer-dossier-client.tsx`, lines 341 and 417 contained external links:
- `href={`/dashboard/bookings/${b.id}`}` ("Open Project Dossier")
- `href={`/dashboard/bookings/${s.bookingId}`}` ("View Session")

In the unified workspace, these external links are eliminated. Clicking any project card in the `TattooProjectsSwitcher` or any session in `UpcomingSessionsCard`:
1. Updates the client-side state `activeBookingId`.
2. Updates the browser URL query parameter shallowly via `window.history.replaceState` or `router.replace(`/dashboard/customers/${customer.id}?bookingId=${newBookingId}`, { scroll: false })`.
3. Immediately updates the Center Column project overview, 7-stage pipeline progression bar, current stage actions, and timeline messages to reflect the selected project without reloading the page.

---

## 5. R4: Data Architecture, Schema Relationships & State Flow

### 5.1 Drizzle ORM Entity Mapping (8 Entities)
The unified workspace relies on 8 core database entities in `src/lib/schema.ts`:

```
                       ┌──────────────┐
                       │   clients    │
                       └──────┬───────┘
                              │ 1:N
              ┌───────────────┼────────────────┬───────────────┐
              │ 1:N           │ 1:N            │ 1:N           │
              ▼               ▼                ▼               ▼
        ┌───────────┐  ┌──────────────┐ ┌─────────────┐ ┌───────────────┐
        │ bookings  │  │ media_assets │ │consent_recs │ │ client_notes  │
        └─────┬─────┘  └──────────────┘ └─────────────┘ └───────────────┘
              │ 1:N
      ┌───────┼────────────────┬───────────────┐
      │ 1:N   │ 1:N            │ 1:N           │ 1:N
      ▼       ▼                ▼               ▼
┌───────────┐ ┌──────────┐ ┌──────────────┐ ┌───────────────┐
│ sessions  │ │ payments │ │   messages   │ │  audit_logs   │
└───────────┘ └──────────┘ └──────────────┘ └───────────────┘
```

| Entity | Primary Key | Foreign Keys | Key Schema Attributes | Role in Unified Workspace |
|---|---|---|---|---|
| `clients` | `id: text` | none | `name`, `email`, `phone`, `instagramHandle`, `dateOfBirth`, `city`, `notes`, `totalSpend` (bigint), `bookingsCount` | Identity, Properties, and Lifetime Spend in Left Column. |
| `bookings` | `id: text` | `clientId -> clients.id`, `artistId -> users.id` | `serviceType`, `designDescription`, `placement`, `approximateSize`, `style`, `quotedAmount`, `stage`, `depositAmount`, `balanceAmount`, `sessionDate` | Active Tattoo Project & Pipeline Stage in Center Column; Project Switcher in Right Column. |
| `booking_sessions` | `id: text` | `bookingId -> bookings.id` | `sessionNumber`, `scheduledStart`, `scheduledEnd`, `durationMinutes`, `status`, `consentStatus`, `overrideReason` | Upcoming Sessions Mini-Calendar & Scheduling in Right Column. |
| `media_assets` | `id: text` | `clientId -> clients.id`, `bookingId -> bookings.id`, `sessionId -> bookingSessions.id` | `url`, `category` (fresh, healed, reference, design, before, touch_up), `caption`, `consentForMarketing` | In-Profile Media Gallery & Upload Drawer in Right Column. |
| `consent_records` | `id: text` | `clientId -> clients.id`, `bookingId -> bookings.id`, `sessionId -> bookingSessions.id` | `legalName`, `dateOfBirth`, `ageVerified`, `healthDisclosures`, `procedureConsent`, `signatureImageUrl`, `pdfUrl`, `signedAt` | Legal Waivers & Medical Disclosures in Right Column; Consent Verification Gate in Center Column. |
| `messages` | `id: text` | `bookingId -> bookings.id` | `channel` (whatsapp, email), `direction` (inbound, outbound), `content`, `templateName`, `hubspotTimelineEventId`, `deliveryStatus`, `createdAt` | Unified Chronological Timeline in Center Column. |
| `payments` | `id: text` | `bookingId -> bookings.id` | `type` (deposit, balance), `amount` (bigint), `currency`, `status`, `provider` (razorpay), `providerRef`, `providerPaymentId`, `paidAt` | Financial Summary & Gateway Transaction Ledger in Right Column. |
| `audit_logs` | `id: text` | `bookingId -> bookings.id`, `userId -> users.id` | `action`, `oldValue`, `newValue`, `metadata`, `createdAt` | Tracking stage changes, consent overrides, and call logs. |

### 5.2 Missing Drizzle Relations Specifications
Static analysis in Survey 1 identified that several inverse and relational declarations are missing from `src/lib/schema.ts`, preventing Drizzle's relational query engine (`db.query`) from resolving nested relationships. 

The following relations definitions must be added to `src/lib/schema.ts`:

```typescript
// 1. Update bookingsRelations in src/lib/schema.ts:
export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  client: one(clients, {
    fields: [bookings.clientId],
    references: [clients.id],
  }),
  artist: one(users, {
    fields: [bookings.artistId],
    references: [users.id],
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
  auditLogs: many(auditLogs),
}));

// 2. Add messagesRelations:
export const messagesRelations = relations(messages, ({ one }) => ({
  booking: one(bookings, {
    fields: [messages.bookingId],
    references: [bookings.id],
  }),
}));

// 3. Add paymentsRelations:
export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

// 4. Add consentFormsRelations (Legacy compatibility):
export const consentFormsRelations = relations(consentForms, ({ one }) => ({
  booking: one(bookings, {
    fields: [consentForms.bookingId],
    references: [bookings.id],
  }),
}));

// 5. Add auditLogsRelations:
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
```

### 5.3 Unified Data Fetching Engine (`getUnifiedCustomerWorkspaceData`)
The existing `getCustomerProfile()` in `src/lib/customers.ts` produces an N+1 query waterfall (iterating through every booking to fetch sessions and payments separately). 

The new `getUnifiedCustomerWorkspaceData()` function replaces this waterfall with a single optimized relational query and cross-project message aggregation:

```typescript
// src/lib/customers.ts
import { db } from "@/lib/db";
import { clients, bookings, bookingSessions, payments, mediaAssets, consentRecords, messages } from "@/lib/schema";
import { eq, desc, asc, inArray } from "drizzle-orm";

export interface UnifiedCustomerWorkspaceData {
  customer: typeof clients.$inferSelect;
  formattedTotalSpend: string;
  totalSpendNumber: number;
  bookings: Array<
    typeof bookings.$inferSelect & {
      sessions: Array<typeof bookingSessions.$inferSelect>;
      payments: Array<typeof payments.$inferSelect>;
      mediaAssets: Array<typeof mediaAssets.$inferSelect>;
      consentRecords: Array<typeof consentRecords.$inferSelect>;
    }
  >;
  sessions: Array<
    typeof bookingSessions.$inferSelect & {
      bookingId: string;
      serviceType: string;
      placement: string | null;
    }
  >;
  messages: Array<typeof messages.$inferSelect>;
  mediaAssets: Array<typeof mediaAssets.$inferSelect>;
  consentRecords: Array<typeof consentRecords.$inferSelect>;
  allPayments: Array<typeof payments.$inferSelect>;
}

export async function getUnifiedCustomerWorkspaceData(
  customerId: string
): Promise<UnifiedCustomerWorkspaceData | null> {
  // 1. Single relational fetch for customer, bookings, sessions, and client-level assets
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

  // 2. Fetch all messages across all client bookings (eliminating project scoping silos)
  const bookingIds = client.bookings.map((b) => b.id);
  const clientMessages =
    bookingIds.length > 0
      ? await db
          .select()
          .from(messages)
          .where(inArray(messages.bookingId, bookingIds))
          .orderBy(asc(messages.createdAt))
      : [];

  // 3. Compute accurate lifetime spend from all settled payments
  const allPayments = client.bookings.flatMap((b) => b.payments);
  const paidTotalPaise = allPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalRupees = Math.round(paidTotalPaise / 100);

  // 4. Flatten all sessions with project context for the right-column calendar
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
```

### 5.4 Server-to-Client Serialization Boundary & BigInt Safety
PostgreSQL `bigint` columns (`totalSpend`, `quotedAmount`, `depositAmount`, `balanceAmount`, `amount`) throw a fatal runtime exception if passed raw across the Next.js Server Component boundary (`Error: Do not know how to serialize a BigInt`).

The route Server Component at `src/app/dashboard/customers/[id]/page.tsx` guarantees serialization safety:

```typescript
// src/app/dashboard/customers/[id]/page.tsx
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-utils";
import { getUnifiedCustomerWorkspaceData } from "@/lib/customers";
import CustomerWorkspaceClient from "./customer-workspace-client";
import { serializeBigInts } from "@/lib/route-utils";

export const dynamic = "force-dynamic";

export default async function CustomerWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bookingId?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { bookingId } = await searchParams;

  const workspaceData = await getUnifiedCustomerWorkspaceData(id);
  if (!workspaceData) {
    notFound();
  }

  // Guaranteed BigInt serialization for Next.js Client Component boundary
  const serializedWorkspaceData = serializeBigInts(workspaceData);

  return (
    <CustomerWorkspaceClient
      initialData={serializedWorkspaceData}
      initialBookingId={bookingId}
    />
  );
}
```

### 5.5 State Management, Multi-Project Switching & Optimistic Updates

#### Client Workspace State Architecture
In `src/app/dashboard/customers/[id]/customer-workspace-client.tsx`, local state coordinates interactions without full page refreshes, incorporating project scoping filters and null-safe active booking selection:

```typescript
export interface WorkspaceState {
  activeBookingId: string | null;
  timelineProjectFilter: "active" | "all"; // Project scoping filter (Reviewer 1 & 2)
  isQuickActionOpen: boolean;
  activeQuickAction: "whatsapp" | "email" | "call" | "note" | null;
  optimisticMessages: Array<typeof messages.$inferSelect>;
  isSchedulingModalOpen: boolean;
  isUploadMediaModalOpen: boolean;
  isCallOutcomeModalOpen: boolean;
  isPaperConsentOverrideModalOpen: boolean;
  isLightboxOpen: boolean;
  selectedLightboxImage: string | null;
  selectedMediaCategory: string;
  isSavingNotes: boolean;
  pinnedAlert: string | null;
}
```

#### Active Booking Resolution & Null Safety Guard (Challenger 1 Finding F6)
To guard against fatal client crashes when a customer has 0 bookings or when an invalid/stale `bookingId` parameter is supplied:
```typescript
// Resolve active tattoo project with cascading defensive fallbacks
const activeBooking =
  initialData.bookings.find((b) => b.id === activeBookingId) ||
  initialData.bookings.find((b) => !isTerminal(b.stage)) ||
  initialData.bookings[0] ||
  null;
```
If `activeBooking === null`, the Center Column renders `NoActiveProjectCard` instead of attempting property lookups on `activeBooking.stage`.

#### Multi-Project Shallow Navigation
When an artist selects a project from `TattooProjectsSwitcher`:
```typescript
const handleSelectProject = (newBookingId: string) => {
  setActiveBookingId(newBookingId);
  // Shallow URL update without page reload or server refetch
  const url = new URL(window.location.href);
  url.searchParams.set("bookingId", newBookingId);
  window.history.replaceState({}, "", url.toString());
};
```

#### Optimistic UI Updates & WhatsApp Return Contract (Challenger 2 Finding 1)
For quick actions (e.g. sending a WhatsApp message or logging a call):
1. Create a transient optimistic message object with temporary ID `opt-${Date.now()}`.
2. Immediately append to `messages` state, re-rendering the Center Column timeline instantly.
3. Fire background asynchronous mutation (`fetch('/api/bookings/[id]/whatsapp', ...)`).
4. **Backend Contract Alignment**: `/api/bookings/[id]/whatsapp` returns `{ ok: true, data: newMessage }` with the persistent database record.
5. **On Success**: Replace `opt-${Date.now()}` with the real database record (`result.data`), adopting the server's persisted UUID and delivery status.
6. **On Error**: Rollback optimistic state by filtering out `opt-${Date.now()}`, and trigger a Sonner error toast with a retry prompt.

```typescript
const handleSendWhatsAppOptimistic = async (content: string, logOnly = false) => {
  if (!activeBooking) {
    toast.error("Cannot dispatch message: No active project selected");
    return;
  }

  const tempId = `opt-${Date.now()}`;
  const optimisticMsg = {
    id: tempId,
    bookingId: activeBooking.id,
    channel: "whatsapp" as const,
    direction: "outbound" as const,
    content,
    templateName: null,
    hubspotTimelineEventId: null,
    deliveryStatus: "sending",
    errorMessage: null,
    createdAt: new Date(),
  };

  setMessages((prev) => [...prev, optimisticMsg]);

  try {
    const res = await fetch(`/api/bookings/${activeBooking.id}/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content, logOnly }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) throw new Error(result.error || "Failed to dispatch message");

    // Reconcile temporary optimistic ID with database UUID from { ok: true, data: newMessage }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId ? { ...m, ...result.data, deliveryStatus: "sent" } : m
      )
    );
    toast.success(logOnly ? "Logged to timeline" : "WhatsApp message dispatched");
  } catch (err: any) {
    // Rollback optimistic update on error
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
    toast.error(`Message dispatch failed: ${err.message}`);
  }
};
```

---

## 6. Step-by-Step Implementation Roadmap

### Phase-by-Phase Execution Schedule

```
Phase 1: Database Schema & Relations Definition (src/lib/schema.ts)
   │
   ▼
Phase 2: Unified Data Fetching Function (src/lib/customers.ts)
   │
   ▼
Phase 3: Route Server Component & BigInt Boundary (src/app/dashboard/customers/[id]/page.tsx)
   │
   ▼
Phase 4: Customer Workspace Client Shell & Responsive Grid (customer-workspace-client.tsx)
   │
   ▼
Phase 5: Left Column Component Suite (Identity, Quick Actions, Properties, Private Notes)
   │
   ▼
Phase 6: Center Column Component Suite (Active Project, 7-Stage Pipeline, Stage Actions, Timeline)
   │
   ▼
Phase 7: Right Column Component Suite (Project Switcher, Embedded Calendar, Media, Financials, Consent)
   │
   ▼
Phase 8: Workspace Modals & Quick Composers (Scheduler, Uploader, Call Logger, Override Gate)
   │
   ▼
Phase 9: Route Consolidation & Redirect Engine (src/app/dashboard/bookings/[id]/page.tsx)
   │
   ▼
Phase 10: Link Migration & Circular Reference Cleanup (bookings-client.tsx & layout)
   │
   ▼
Phase 11: End-to-End Typecheck, Verification & Regression Audit
```

### File-by-File Modification Inventory

| Step | Action | File Path | Scope of Modification |
|---|---|---|---|
| **1.1** | **Modify** | `src/lib/schema.ts` | Add missing Drizzle relations: `bookingsRelations` (`messages`, `consentForm`), `messagesRelations`, `paymentsRelations`, `consentFormsRelations`, and `auditLogsRelations`. |
| **1.2** | **Modify** | `src/app/api/bookings/[id]/whatsapp/route.ts` | Update return payload contract from `{ ok: true }` to `{ ok: true, data: newMessage }` to allow client optimistic ID reconciliation (Challenger 2 Finding 1). |
| **2.1** | **Modify** | `src/lib/customers.ts` | Export `UnifiedCustomerWorkspaceData` interface. Implement `getUnifiedCustomerWorkspaceData(customerId)` resolving the N+1 waterfall query and aggregating all messages across customer bookings. |
| **3.1** | **Modify** | `src/app/dashboard/customers/[id]/page.tsx` | Update Server Component to accept `searchParams.bookingId`, invoke `getUnifiedCustomerWorkspaceData()`, apply `serializeBigInts()`, and render `CustomerWorkspaceClient`. |
| **4.1** | **Create** | `src/app/dashboard/customers/[id]/customer-workspace-client.tsx` | Master client component orchestrating responsive 3-column / 2-column / 1-column layout, sticky scroll isolation (`max-h-[calc(100vh-5.5rem)] overflow-y-auto`), null-safe active booking selection (`activeBooking || null`), optimistic messages, and modal visibility. |
| **5.1** | **Create** | `src/components/dashboard/customer-workspace/left-column/customer-identity-card.tsx` | Large monogram avatar, customer display name, VIP/Repeat collector badge, client since timestamp. |
| **5.2** | **Create** | `src/components/dashboard/customer-workspace/left-column/quick-actions-toolbar.tsx` | 4 quick action shortcuts: WhatsApp modal trigger, Email modal trigger, Phone dialer with call logger, Notes focus trigger. |
| **5.3** | **Create** | `src/components/dashboard/customer-workspace/left-column/client-properties-card.tsx` | "About this Client" attribute list: Phone, Email, Instagram, City, DOB, Lifetime Spend, Total Projects count. |
| **5.4** | **Create** | `src/components/dashboard/customer-workspace/left-column/artist-private-notes.tsx` | Artist consultation notes textarea with auto-sync and manual save button wired to `PATCH /api/customers/[id]/notes`. Scroll-isolated within Left Column. |
| **6.1** | **Create** | `src/components/dashboard/customer-workspace/center-column/active-project-header.tsx` | Active tattoo project overview: Service type, design brief, placement, approximate size, style, quoted budget. |
| **6.2** | **Create** | `src/components/dashboard/customer-workspace/center-column/pipeline-progression-bar.tsx` | 7-stage visual pipeline tracker (`V1_PIPELINE_STAGES`) with pulsing active step ring, stage normalizer, terminal state badges, and responsive step tooltips for container width < 700px (Challenger 1 Finding F2). |
| **6.3** | **Create** | `src/components/dashboard/customer-workspace/center-column/current-stage-action-card.tsx` | Dynamic action center mapped to active stage: consultation review, Razorpay deposit link generator, appointment slot coordinator, consent gate, balance payment generator, healed photo follow-up dispatcher. |
| **6.4** | **Create** | `src/components/dashboard/customer-workspace/center-column/communication-timeline.tsx` | Chronological feed of WhatsApp and Email touchpoints with internal scroll container (`max-h-[500px] overflow-y-auto pr-2 scrollbar-thin`), project filter toggle (`[Active Project Only]` vs `[All Client Projects]`), direction badges, and message templates. |
| **6.5** | **Create** | `src/components/dashboard/customer-workspace/center-column/quick-whatsapp-composer.tsx` | Inline composer with `wa.me` deep-link, timeline logger (`logOnly: true`), and Meta Cloud API dispatcher. |
| **6.6** | **Create** | `src/components/dashboard/customer-workspace/center-column/no-active-project-card.tsx` | Dedicated empty state card rendered when `bookings.length === 0` or `activeBooking === null` ("No Active Tattoo Projects - [+ Create New Project]") preventing runtime null exceptions. |
| **7.1** | **Create** | `src/components/dashboard/customer-workspace/right-column/tattoo-projects-switcher.tsx` | List of client bookings with service type and stage pills, allowing instant active project switching without page reload. |
| **7.2** | **Create** | `src/components/dashboard/customer-workspace/right-column/upcoming-sessions-card.tsx` | Embedded sessions list with dates, durations, consent status badges, and "+ Schedule New Session" button. |
| **7.3** | **Create** | `src/components/dashboard/customer-workspace/right-column/embedded-media-gallery.tsx` | Tabbed photo gallery (Reference, Design, Fresh, Healed, Touch-up) with thumbnail grid, lightbox trigger, and upload button. |
| **7.4** | **Create** | `src/components/dashboard/customer-workspace/right-column/financial-summary-card.tsx` | Quoted amount, deposit status, balance due, and responsive stacked transaction cards layout with `overflow-x-auto` to prevent narrow desktop (1280px) column squeezing (Challenger 1 Finding F2). |
| **7.5** | **Create** | `src/components/dashboard/customer-workspace/right-column/digital-consent-card.tsx` | Signed digital waivers, age verification badge, medical disclosures checklist, signature canvas preview, and paper override button. |
| **8.1** | **Create** | `src/components/dashboard/customer-workspace/modals/schedule-session-modal.tsx` | Inline modal for scheduling appointments with slot conflict detection, Google Calendar sync, and session duration picker. |
| **8.2** | **Create** | `src/components/dashboard/customer-workspace/modals/upload-media-modal.tsx` | Multi-image file uploader with category dropdown, marketing consent toggle, and caption input. |
| **8.3** | **Create** | `src/components/dashboard/customer-workspace/modals/log-call-modal.tsx` | Phone dialer shortcut with call outcome selector (Connected, Left Voicemail, Busy) and notes logger. |
| **8.4** | **Create** | `src/components/dashboard/customer-workspace/modals/paper-consent-override-modal.tsx` | Verification dialog requiring written justification when completing a session with a physical paper consent form. |
| **8.5** | **Create** | `src/components/dashboard/customer-workspace/modals/image-lightbox-modal.tsx` | Full-screen image zoom modal with category badge and capture timestamp. |
| **9.1** | **Modify** | `src/app/dashboard/bookings/[id]/page.tsx` | Replace existing booking detail view with server-side redirect to `/dashboard/customers/[clientId]?bookingId=[id]`, preserving all incoming query parameters via `URLSearchParams` and redirecting invalid booking IDs to `/dashboard/bookings?error=booking_not_found` (Challenger 1 Findings F4 & F5). |
| **10.1** | **Modify** | `src/app/dashboard/bookings/bookings-client.tsx` | Update booking title links (line 710) and "Manage Dossier" buttons (line 869) to point directly to `/dashboard/customers/${b.clientId}?bookingId=${b.id}`; handle `?error=booking_not_found` query param with friendly toast alert. |
| **11.1** | **Verify** | Global Codebase | Execute `bun run typecheck` (`tsc --noEmit`) to verify zero compiler errors and execute unit tests. |

---

## 7. Risk Assessment, Fallback Systems & Mitigations

| Risk / Failure Mode | Severity | Impact | Mitigation Strategy |
|---|---|---|---|
| **Sticky Column Viewport Truncation (F1)** | **High** | Left Column height (998px) exceeds standard 768px-900px laptop screens; `sticky top-20` cuts off bottom 278px (Private Notes textarea and Save button). Center timeline scrolling expands window to 4000px, leaving side column voids. | Apply `sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto pr-1 scrollbar-thin` to Left and Right columns. Isolate Center Column messages inside `max-h-[500px] overflow-y-auto pr-2 scrollbar-thin` container. |
| **Narrow Desktop (1280px) Column Squeezing (F2)** | **Medium** | Net column width is 264px in Left/Right and 560px in Center. A 6-column financial table averages 44px/col, and 7-stage pipeline labels overflow their 80px slots. | Format Financial Ledger as responsive stacked transaction cards (or add `overflow-x-auto`). Implement responsive step indicators on 7-stage pipeline bar (render icons/numbers with Radix Tooltips when container width < 700px). |
| **Tablet Breakpoint CSS Discrepancy (F3)** | **Medium** | Using `lg:col-span-4` breaks 2-column layout on 768px-1023px viewports (standard iPad portrait), collapsing prematurely into 1-column stacked mode. | Update layout classes to use Tailwind `md:` breakpoint: `col-span-12 md:col-span-4 xl:col-span-3` and `col-span-12 md:col-span-8 xl:col-span-6`. |
| **Query Parameter Stripping on Redirect (F4)** | **Medium** | Redirecting `/dashboard/bookings/[id]` without forwarding `searchParams` drops Razorpay return params (`?payment_status=success`), session deep-links, or marketing tags. | Update `BookingRedirectPage` signature to accept `searchParams`, construct `URLSearchParams`, merge `bookingId`, and forward all parameters to `/dashboard/customers/[id]`. |
| **Unstyled 404 on Invalid Booking ID (F5)** | **Low** | Calling `notFound()` when booking ID is invalid renders raw Next.js 404 page, destroying the dashboard navigation shell and sidebar. | Redirect missing/archived booking IDs to `/dashboard/bookings?error=booking_not_found`, and display a friendly Sonner toast alert while preserving the intact dashboard layout shell. |
| **Zero-Booking Client Render Crash (F6)** | **Medium** | If client has 0 bookings or invalid `bookingId` is provided, `activeBooking` evaluates to `undefined`, causing fatal `TypeError: Cannot read properties of undefined (reading 'stage')`. | Implement defensive fallback resolution (`bookings.find(...) \|\| bookings.find(!isTerminal) \|\| bookings[0] \|\| null`) and render dedicated `NoActiveProjectCard` empty state when `activeBooking === null`. |
| **WhatsApp Optimistic ID Desynchronization (Challenger 2 Finding 1)** | **Medium** | API route `/api/bookings/[id]/whatsapp` returns `{ ok: true }` without `data`. Optimistic message update cannot reconcile temporary `opt-...` ID with persisted database UUID. | Update `/api/bookings/[id]/whatsapp` return contract to `{ ok: true, data: newMessage }`. Client swaps `tempId` with `result.data.id` upon successful HTTP response. |
| **Repeat Client Timeline Clutter (Reviewer 1 & 2 Finding)** | **Low** | Aggregating all messages across multiple historical projects interleaves past and present conversations, confusing studio staff. | Provide a scoping toggle on `CommunicationTimeline`: `[Active Project Only]` vs `[All Client Projects]` (defaulting to active project), with project badges displayed in all-projects mode. |
| **BigInt Serialization Boundary Exception** | **High** | Passing un-serialized `bigint` fields (`totalSpend`, `quotedAmount`, `depositAmount`, `balanceAmount`, `amount`) to Client Components crashes Next.js runtime. | Apply `serializeBigInts()` or `JSON.parse(JSON.stringify(..., replacer))` in `page.tsx` before returning props. Enforce strict TypeScript types expecting `string \| number` on client interfaces. |
| **Meta WhatsApp API Disruption or Missing Keys** | **Medium** | If WhatsApp Cloud API credentials are unset or Meta experiences downtime, outgoing messages fail. | The `QuickWhatsAppComposer` includes a direct `wa.me` deep-link button that launches WhatsApp Web or mobile app natively with the message pre-filled, bypassing API credentials entirely. Includes a "Log to Timeline" button to record touchpoints locally. |
| **Legacy Database Stage Mismatch** | **Medium** | Existing database records contain legacy stage names (`in_consultation`, `deposit_requested`, `session_complete`, `paid_in_full`) rather than V1 canonical names. | All pipeline rendering passes the active stage through `normalizeToV1Stage(booking.stage)` from `src/lib/state-machine.ts`. This translates all 20 legacy variants into the 7 canonical stages without requiring database mutations. |
| **Session Scheduling Conflict** | **Medium** | Two artists attempt to schedule appointments overlapping on the same studio station or time. | The `ScheduleSessionModal` performs a pre-flight overlap check querying existing `booking_sessions` for the requested window, alerting the user before persisting the booking. |
| **Missing Consent Legal Liability** | **High** | An artist attempts to complete a session without verified legal waiver or age verification. | The `markSessionComplete` workflow strictly verifies `booking.consentSignedAt`. If missing, the operation is blocked unless the artist enters an audited justification in `PaperConsentOverrideModal`, which is recorded in `audit_logs`. |
| **E2B Sandbox Memory Watchdog** | **Medium** | Long-running background commands or memory spikes in the Windows sandbox could trigger the watchdog process killer. | Avoid spawning background development servers (`bun run dev`). Perform static analysis and verification using focused typecheck commands (`bun run typecheck`). |

---

## 8. Verification Protocol & Acceptance Criteria

### 8.1 Acceptance Criteria Checklist
- [x] **R1. Unified 3-Column Architecture**: Complete wireframes and ASCII layout diagrams specified for 3-column desktop (`>=1280px`), 2-column tablet (`768-1279px` with `md:` grid classes), and stacked tabbed mobile (`<768px`). Component hierarchy documented across Left, Center, and Right panels adhering to luxury studio theme tokens.
- [x] **Sticky Viewport Constraints & Scroll Isolation (F1)**: Left and Right columns constrained with `sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto pr-1 scrollbar-thin` preventing Private Notes cutoff on 768px-900px screens. Communication Timeline bounded with `max-h-[500px] overflow-y-auto pr-2 scrollbar-thin` isolating message scroll.
- [x] **Narrow Desktop (1280px) Overflow Protection (F2)**: Financial Summary Card specifies stacked transaction cards with `overflow-x-auto` for the 264px net column. 7-Stage Pipeline bar specifies responsive step indicators (rendering numbers/icons with Radix Tooltips when container width < 700px).
- [x] **Tablet Breakpoint Grid Class Correction (F3)**: Corrected layout classes to `col-span-12 md:col-span-4 xl:col-span-3` and `col-span-12 md:col-span-8 xl:col-span-6` ensuring true 2-column layout on iPad portrait (768px-1023px).
- [x] **R2. Direct In-Profile Embedding**: Detailed specification for in-profile embedding of Calendar/Sessions, Media Gallery, Chronological Communication Timeline with triple-dispatch WhatsApp composer, Financial Ledger, and Digital Consent Records with physical override gate.
- [x] **Communication Timeline Project Filter (Reviewer 1 & 2)**: Added `[Active Project Only]` vs `[All Client Projects]` filter toggle on the Communication Timeline to prevent message clutter for repeat collectors.
- [x] **WhatsApp Route Return Contract (Challenger 2 Finding 1)**: Documented `/api/bookings/[id]/whatsapp` return envelope as `{ ok: true, data: newMessage }` enabling client reconciliation of `opt-...` temporary IDs with persisted database UUIDs.
- [x] **R3. Route Consolidation & Navigation**: Canonical route established at `/dashboard/customers/[id]` with multi-project `?bookingId=[id]` query parameter. Complete server-side redirect engine specified for `/dashboard/bookings/[id]/page.tsx`. Pipeline registry links in `bookings-client.tsx` updated to eliminate circular navigation.
- [x] **Query Parameter Preservation on Redirect (F4)**: `BookingRedirectPage` extracts `searchParams: Promise<Record<string, ...>>`, merges `bookingId`, and preserves all incoming parameters via `URLSearchParams`.
- [x] **Graceful Invalid Booking ID Handling (F5)**: Replaced raw unstyled `notFound()` with redirect to `/dashboard/bookings?error=booking_not_found` and Sonner toast alert, keeping dashboard navigation shell intact.
- [x] **Zero-Booking Client & Null Safety Guard (F6)**: Cascading fallback `activeBooking` resolution in `CustomerWorkspaceClient` and dedicated `NoActiveProjectCard` empty state ("No Active Tattoo Projects - [+ Create New Project]") preventing runtime null crashes.
- [x] **R4. Data Architecture & Implementation Blueprint**: Drizzle ORM schema mapping across all 8 entities. Missing relations defined for `bookingsRelations`, `messagesRelations`, `paymentsRelations`, `consentFormsRelations`, and `auditLogsRelations`. Optimized `getUnifiedCustomerWorkspaceData()` query resolving N+1 waterfall. BigInt serialization boundary handling documented. Sequenced file-by-file implementation plan with risk mitigations.
- [x] **Codebase Integrity**: Project typecheck (`bun run typecheck`) confirmed clean with zero errors.

### 8.2 Independent Verification Commands
To verify the technical integrity of this specification:

1. **TypeScript Typecheck Command**:
   ```powershell
   bun run typecheck
   ```
   *Expected Output*: `Exit code: 0` (zero compilation errors).

2. **State Machine Pipeline Test**:
   ```powershell
   bun test tests/state-machine-v1.test.ts
   ```
   *Expected Output*: All 6 unit tests pass.

3. **Verify Existing Circular Links to be Replaced**:
   - Inspect `src/app/dashboard/bookings/[id]/booking-detail-client.tsx:305` (links to `/dashboard/customers/${booking.client.id}`).
   - Inspect `src/app/dashboard/customers/[id]/customer-dossier-client.tsx:341, 417` (links to `/dashboard/bookings/${b.id}`).
   - Inspect `src/app/dashboard/bookings/bookings-client.tsx:710, 869` (links to `/dashboard/bookings/${b.id}`).

4. **Verify Schema & Missing Relations**:
   - Inspect `src/lib/schema.ts:486-546` to confirm that `messagesRelations` and `paymentsRelations` are absent and require registration.
   - Inspect `src/lib/customers.ts:142-161` to confirm the existing N+1 waterfall query in `getCustomerProfile()`.
