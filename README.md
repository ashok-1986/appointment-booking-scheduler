# Meet Prerna: Tattoo appointment booking and studio management

Appointment booking, intake, and workflow management for Meet Prerna Tattoo Studio.

## Visual identity

- Primary accent: Green (`#C4FF61`), used for active statuses and highlights.
- Secondary accent: Yellow (`#EAFF27`), used for alerts and tags.
- Background: Dark gray (`#1A1A1A`).
- Surface: Off-white ivory (`#FDFFE9`).
- Typography: Cormorant Garamond for headings; Montserrat for interface text and form controls; Geist Mono for currency, timestamps, and counts.

## Features

### Client intake (`/enquiry`)
- Intake form collecting contact info, birth date, preferred timeline, Instagram handle, and tattoo concept.
- Image uploader for reference photos.
- Confirmation screen with links to studio Instagram, Pinterest, website, and WhatsApp.

### Artist dashboard (`/dashboard/bookings`)
- Live counters for new enquiries, pending reviews, deposits, and scheduled sessions.
- Filter bar for booking stages (leads, deposits, studio sessions, aftercare, closed).
- Stage dropdown with counts for each status.
- Booking cards with client contact details, timeline, photo thumbnails, and a direct WhatsApp link.

### Client dossier and actions (`/dashboard/bookings/[id]`)
- Step-by-step progress tracker covering each stage from initial enquiry to healed review.
- Stage-specific actions:
  - Stages 1 to 3: Record consultation notes and qualify or decline enquiries.
  - Stages 4 to 5: Create Razorpay deposit links (30% deposit calculation, 72-hour expiry, sent via WhatsApp and email).
  - Stages 6 to 7: Schedule sessions and collect digital consent signatures.
  - Stages 8 to 9: Settle balance payments through Razorpay.
  - Stages 10 to 11: Send healed photo requests and collect reviews.
- Communication log with outbound and inbound messages, plus an inline WhatsApp reply box.
- Reference image viewer for uploaded designs.

## Tech stack

- Framework: [Next.js](https://nextjs.org/) (App Router, React 19)
- Styling: [Tailwind CSS v4](https://tailwindcss.com/)
- Database and ORM: [Drizzle ORM](https://orm.drizzle.team/) with [Supabase](https://supabase.com/) PostgreSQL
- Authentication: [Better Auth](https://better-auth.com/)
- Integrations:
  - Razorpay: Payment links and webhook handling
  - HubSpot: Contact and deal synchronization
  - WhatsApp Cloud API: Client messages and notifications
  - Google Calendar: Appointment scheduling

## Getting started

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or Node.js 20+

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

## Security and environment variables

Copy `.env.example` to `.env` and fill in the required values:

- `DATABASE_URL`: PostgreSQL connection string (Supabase IPv4 Pooler)
- `BETTER_AUTH_SECRET`: Secret key for session encryption
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: Razorpay API credentials
- `HUBSPOT_ACCESS_TOKEN`: HubSpot private app token
- `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`: Meta WhatsApp Cloud API credentials
