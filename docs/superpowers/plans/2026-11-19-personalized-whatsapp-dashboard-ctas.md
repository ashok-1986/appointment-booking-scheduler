# Implementation Plan: Personalized WhatsApp CTAs across Dashboard

## Problem Statement
The user requested:
> "Check all the whatsApp CTAs in the dashboard, The reciever should always be client and the sender should always be Prerna. Also, each whatsapp button click should have a personalized message depending on the name, pipeline etc"

Currently across the dashboard:
1. Some WhatsApp links use a generic static string (`Hi ${name}, this is Prerna from Meet Prerna Tattoo Studio.`) regardless of pipeline stage.
2. In `customer-workspace-client.tsx`, the fallback opens `https://wa.me/${cleanPhone}` without pre-filled text.
3. In `quick-whatsapp-composer.tsx`, clicking "Open in WhatsApp" with an empty textarea throws an error rather than sending a stage-aware default, and the template options do not identify the sender as Prerna.
4. Messages across calendar and bookings need consistent signing from Prerna, with the client as the recipient, and personalized by client name, tattoo pipeline stage (canonical 7 V1 stages), placement, service type, and session details.

---

## Architecture & Proposed Solution

### 1. Centralized WhatsApp Composer Service (`src/lib/services/whatsapp-composer.ts`)
Create a single source of truth for dashboard WhatsApp messages and URL generation:
- `normalizePhoneForWhatsApp(phone: string): string`: cleans non-digit characters and ensures country code (`91` for 10-digit Indian numbers).
- `buildPersonalizedWhatsAppMessage(params)`:
  - **Receiver**: Client (`Hi ${firstName}!`)
  - **Sender**: Prerna (`It's Prerna from Meet Prerna Tattoo Studio.` / signing off `- Prerna`)
  - **Stage-Aware Personalization** using `normalizeToV1Stage(stage)`:
    - `new_enquiry`: Acknowledges intake enquiry, tattoo idea/placement, asks to discuss design concept.
    - `consultation_review`: References concept & references review, suggests locking down sizing & placement consultation.
    - `deposit_pending`: Mentions custom quote is prepared, provides instructions to confirm booking with deposit link.
    - `confirmed_scheduled`: Confirms appointment details (date, time, service, placement, studio location in Indiranagar, Bangalore, preparation tips: hydrate, eat well, complete digital consent).
    - `session_completed`: Celebrates completed tattoo session, reminds to follow aftercare instructions closely.
    - `payment_pending`: Thanks client for session, prompts for settling balance payment.
    - `closed_followup`: Checks in on healing, asks for healed photos & feedback.
    - `not_a_fit` / `cancelled`: Polite status follow-up from Prerna.
    - Default / Repeat Customer: Warm check-in from Prerna for repeat clients.
- `buildPersonalizedWhatsAppUrl(params)`: formats `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`.
- `WHATSAPP_STAGE_TEMPLATES`: Rich preset templates for inline composers with sender "Prerna".

### 2. Integration Touchpoints
- **Bookings List** (`src/app/dashboard/bookings/bookings-client.tsx`): Row CTA generates stage-specific link.
- **Booking Detail** (`src/app/dashboard/bookings/[id]/booking-detail-client.tsx`): Header CTA & Quick WhatsApp Composer use stage-aware messages.
- **Calendar & Session Modals** (`src/app/dashboard/calendar/page.tsx`, `src/app/api/calendar/sessions/route.ts`, `src/components/dashboard/calendar/session-details-modal.tsx`): Explicitly signed by Prerna, client receiver, session time & details formatted.
- **Customer Dossier** (`src/app/dashboard/customers/[id]/customer-dossier-client.tsx`): Uses active booking stage to build personalized message.
- **Customer Workspace** (`src/app/dashboard/customers/[id]/customer-workspace-client.tsx` & `src/components/dashboard/customer-workspace/center-column/quick-whatsapp-composer.tsx`): Passes stage & service to composer; fallback opens personalized link; composer templates updated with sender Prerna.
- **Customer Registry** (`src/app/dashboard/customers/customers-client.tsx`): Uses `latestBookingStage`, `isRepeat`, and customer name.

---

## Tasks Breakdown

### Task 1: Centralized WhatsApp Composer Service & Unit Tests
- Create `src/lib/services/whatsapp-composer.ts`
- Create `tests/whatsapp-composer.test.ts`
- Commit: `feat(whatsapp): implement centralized personalized whatsapp message composer service`

### Task 2: Bookings List & Booking Detail Page Integration
- Update `src/app/dashboard/bookings/bookings-client.tsx`
- Update `src/app/dashboard/bookings/[id]/booking-detail-client.tsx`
- Commit: `feat(whatsapp): personalize booking list and dossier whatsapp CTAs by pipeline stage`

### Task 3: Calendar Session Confirmations & Modal Integration
- Update `src/app/dashboard/calendar/page.tsx`
- Update `src/app/api/calendar/sessions/route.ts`
- Update `src/components/dashboard/calendar/whatsapp-modal.tsx`
- Create `tests/calendar-whatsapp-cta.test.ts`
- Commit: `feat(whatsapp): personalize calendar confirmation messages with explicit artist signoff`

### Task 4: Customer Dossier, Registry, & Workspace Composer Integration
- Update `src/app/dashboard/customers/[id]/customer-dossier-client.tsx`
- Update `src/app/dashboard/customers/customers-client.tsx`
- Update `src/app/dashboard/customers/[id]/customer-workspace-client.tsx`
- Update `src/components/dashboard/customer-workspace/center-column/quick-whatsapp-composer.tsx`
- Create `tests/customer-whatsapp-ctas.test.ts`
- Commit: `feat(whatsapp): personalize customer registry and workspace composer with stage awareness`

### Task 5: Final Review, Full Suite Verification, Merge & Push
- Run `bun .\node_modules\typescript\bin\tsc --noEmit`
- Run all test suites
- Merge to `main` and push to remote
