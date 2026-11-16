# Meet Prerna — Bespoke Tattoo Appointment Booking Flow & Management Dashboard

An end-to-end bespoke appointment booking system, client intake portal, and 12-stage artist management dashboard crafted for **Meet Prerna Tattoo Studio**.

---

## 🎨 Visual Identity & Brand Design System

* **Primary Accent**: Inchworm (`#C4FF61`) — Vibrant green for creativity and active status accents
* **Secondary Accent**: Maximum Yellow (`#EAFF27`) — Optimistic yellow for alerts and timeline tags
* **Background**: Eerie Black (`#1A1A1A`) — Editorial luxury dark canvas
* **Contrast Base**: Ivory (`#FDFFE9`) — Soft luxury neutral surface
* **Typography**:
  * **Headings**: `Cormorant Garamond` (strictly for headers `h1`–`h6`, client dossier names, and hero titles)
  * **Body & UI**: `Montserrat` (controls, inputs, buttons, badges, tables, and tabs)
  * **Financial & Data**: `Geist Mono` (currency figures in ₹, timestamps, and stage counts)

---

## 🚀 Key Features

### 1. Client-Facing Intake Flow (`/enquiry`)
* High-converting, bespoke multi-field intake matching studio branding.
* Full intake dossier: Full Name, Email, Phone, City, Date of Birth, Gender, Desired Tattoo Timeline (ASAP/This Week, 1–2 Months, 3+ Months, Flexible), Instagram Handle (`@`), and Tattoo Concept Description.
* Drag-and-drop reference image uploader supporting multi-photo reference galleries.
* Confetti celebration ending screen with direct studio links (Instagram, Pinterest, Website, and WhatsApp).

### 2. Artist Studio Management Dashboard (`/dashboard/bookings`)
* **Bento Grid Metrics**: Live counters for *Total Inflow*, *Needs Review*, *Deposit Stage*, and *Studio Sessions*.
* **Streamlined Lifecycle Filter Bar**: Filters across phases (*All Bookings*, *Leads & Intake*, *Deposits*, *Studio Sessions*, *Aftercare*, *Not a Fit*).
* **Precision 12-Stage Selector**: Color-coded stage dropdown with live counts.
* **Rich Booking Cards**: Client initials avatar ringed in `#C4FF61`, City & Instagram chips, timeline badge, reference photo thumbnail preview, 1-click direct WhatsApp chat link, and "Manage Dossier" CTA.

### 3. Client Dossier & Lifecycle Actions (`/dashboard/bookings/[id]`)
* **12-Stage Visual Pipeline Stepper**: Tracks status from initial lead to healed photo completion.
* **Context-Aware Action Center**:
  * **Stages 1–3**: Consultation vetting (In Consultation, Qualify, Not a Fit with courteous reason).
  * **Stages 4–5**: Razorpay deposit payment link generation (auto 30% calculation, WhatsApp & Email dispatch, 72h expiry).
  * **Stage 6–7**: Calendar scheduling & digital consent form gate (with legal paper override audit trail).
  * **Stage 8–9**: Balance payment settlement via Razorpay.
  * **Stages 10–11**: 3-week healed photo follow-up and 5-star satisfaction review collection.
* **Live Activity & Comms Timeline**: Inbound/outbound message bubbles with an embedded direct WhatsApp reply composer.
* **Reference Designs Gallery**: Lightbox modal to inspect high-resolution tattoo reference uploads.

---

## 🛠️ Tech Stack

* **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with `@theme inline` font tokens
* **Database & ORM**: [Drizzle ORM](https://orm.drizzle.team/) with [Supabase](https://supabase.com/) PostgreSQL (Session Pooler)
* **Authentication**: [Better Auth](https://better-auth.com/) with role-based access control (`artist`, `studio_admin`)
* **Integrations**:
  * **Razorpay**: Payment links & webhook lifecycle synchronization
  * **HubSpot CRM**: Two-way contact and deal property syncing
  * **WhatsApp Cloud API**: Automated client notifications & direct chatting
  * **Google Calendar**: Session scheduling & booking coordination

---

## 📦 Getting Started

### Prerequisites
* [Bun](https://bun.sh/) (preferred package manager) or Node.js 20+

### Installation

```bash
# Clone the repository
git clone https://github.com/ashok-1986/appointment-booking-scheduler.git
cd appointment-booking-scheduler

# Install dependencies
bun install

# Configure environment variables
cp .env.example .env

# Run database migrations
bun run db:push

# Start the local development server
bun run dev --port 4000
```

Open [http://localhost:4000/dashboard/bookings](http://localhost:4000/dashboard/bookings) in your browser.

---

## 🔒 Security & Environment Variables

Copy `.env.example` to `.env` and provide your API keys:

* `DATABASE_URL`: PostgreSQL connection string (Supabase IPv4 Pooler)
* `BETTER_AUTH_SECRET`: Secret key for session encryption
* `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: Razorpay credentials
* `HUBSPOT_ACCESS_TOKEN`: HubSpot private app token
* `WHATSAPP_TOKEN` & `WHATSAPP_PHONE_NUMBER_ID`: Meta WhatsApp Cloud API credentials
