# Artist Appointment Booking & Operations — Design System

> Operational dashboard and client interaction flows for professional studio artists and studio admins.

**Theme:** Light (with high-contrast dark accents and accessible semantic states)

---

## 1. System Overview

This design system defines the visual and structural language for the **Artist Appointment Booking Workflow and Management Dashboard**. Unlike marketing or canvas tools, this is an **operations and workflow engine** balancing two distinct interaction modes:

1. **Artist & Admin Operations Dashboard (`/dashboard`)**: High-density, data-rich operational cockpit designed for speed. Emphasizes structured data tables, real-time stage progression pipelines, threaded multi-channel communication logs (WhatsApp/Email), and immediate quick-actions (qualifying leads, generating payment links, scheduling calendar slots).
2. **Client-Facing Interaction Portals (`/enquiry`, `/consent`, `/feedback`)**: Focused, mobile-first, distraction-free transactional experiences designed for high trust and clarity (intake questionnaires, legally binding digital consent forms, and aftercare feedback).

---

## 2. Color Tokens

### 2.1 Brand & Neutral Scale

| Token Name | Hex Value | CSS Variable | Operational Role |
| :--- | :--- | :--- | :--- |
| **Studio Canvas** | `#f8fafc` | `--color-canvas` | Primary application background behind cards and sidebars |
| **Surface White** | `#ffffff` | `--color-surface` | Primary elevated card surface, table rows, and modal dialogs |
| **Hairline Border**| `#e2e8f0` | `--color-border` | Subtle structural dividers and card borders |
| **Subtle Fill** | `#f1f5f9` | `--color-fill-subtle` | Input fields, table header fills, and inactive button backgrounds |
| **Text Primary** | `#0f172a` | `--color-text-primary`| Maximum-contrast headings, active labels, and primary copy |
| **Text Secondary**| `#475569` | `--color-text-secondary`| Form labels, metadata captions, and secondary actions |
| **Text Muted** | `#94a3b8` | `--color-text-muted` | Placeholder copy, timestamp footnotes, and disabled states |
| **Studio Brand** | `#4f46e5` | `--color-brand` | Primary interactive focus, active navigation pills, and primary CTAs |

### 2.2 Semantic & Notification Tokens

| State | Hex Value | CSS Variable | Usage |
| :--- | :--- | :--- | :--- |
| **Success** | `#16a34a` | `--color-success` | Verified payments, signed consent forms, completed sessions |
| **Warning** | `#d97706` | `--color-warning` | Expiring payment links (<72h), unsigned consent alerts (<24h) |
| **Destructive** | `#dc2626` | `--color-destructive` | Blocked sessions, "Not a Fit" rejections, overdue balances (>7d) |
| **Info / Lead**| `#2563eb` | `--color-info` | New incoming enquiries and consultation updates |

### 2.3 Pipeline Stage Badge System (12 Stages)

| Stage Enum | Badge Fill | Badge Text | Border | Visual Meaning |
| :--- | :--- | :--- | :--- | :--- |
| `enquiry` | `#eff6ff` | `#1d4ed8` | `#bfdbfe` | New intake, awaiting review |
| `in_consultation` | `#f5f3ff` | `#6d28d9` | `#ddd6fe` | WhatsApp/Email dialogue active |
| `qualified` | `#ecfeff` | `#0e7490` | `#a5f3fc` | Design & scope approved by artist |
| `not_a_fit` | `#fef2f2` | `#b91c1c` | `#fecaca` | Closed enquiry / declined |
| `deposit_requested` | `#fffbeb` | `#b45309` | `#fde68a` | Razorpay link generated |
| `deposit_pending` | `#fff7ed` | `#c2410c` | `#fed7aa` | Awaiting client payment (<72h) |
| `deposit_paid` | `#f0fdf4` | `#15803d` | `#bbf7d0` | Payment captured; ready to schedule |
| `scheduled` | `#ecfdf5` | `#047857` | `#a7f3d0` | Date confirmed on Google Calendar |
| `session_complete`| `#faf5ff` | `#7e22ce` | `#e9d5ff` | Session finished; aftercare sent |
| `paid_in_full` | `#f0fdf4` | `#166534` | `#86efac` | Deposit and balance both cleared |
| `follow_up_sent` | `#f8fafc` | `#475569` | `#cbd5e1` | 30-day healed photo request sent |
| `follow_up_completed`| `#f1f5f9`| `#334155` | `#94a3b8` | Rating and review logged |

---

## 3. Typography & Information Hierarchy

* **Primary Font Family**: `Inter`, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
* **Tabular Figures**: Every numeric data point (amounts in `₹` or `paise`, dates, durations, and phone numbers) must render with `font-variant-numeric: tabular-nums` to maintain aligned vertical reading in tables.

### Type Scale

| Role | Size | Line Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | 28px | 1.2 | 700 | -0.02em | Main page headers (`Bookings`, `Enquiry Intake`) |
| **Section** | 20px | 1.3 | 600 | -0.01em | Booking detail section heads, modal titles |
| **Card Head** | 16px | 1.4 | 600 | 0.00em | Card headers, form section separators |
| **Body (UI)** | 14px | 1.5 | 400/500 | 0.00em | Table cell text, form labels, chat message copy |
| **Caption** | 12px | 1.4 | 500 | +0.01em | Stage badges, metadata timestamps, input hints |
| **Micro** | 11px | 1.3 | 600 | +0.04em | Uppercase table column headers, audit action tags |

---

## 4. Spacing, Layout & Elevation

* **Base Unit**: 4px
* **Density Profile**: Compact & high-efficiency for `/dashboard`; comfortable single-column for client flows.
* **Border Radii**:
  * Badges & Tags: `4px`
  * Buttons & Inputs: `6px`
  * Cards, Drawers & Dialogs: `8px` to `12px`
  * Avatars & Status Indicators: `9999px` (Full circle)
* **Shadow Hierarchy**:
  * `--shadow-sm`: `0 1px 2px 0 rgb(0 0 0 / 0.05)` (Cards, input fields on focus)
  * `--shadow-md`: `0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)` (Action popovers, dropdowns)
  * `--shadow-lg`: `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` (Modal dialogs, slide-over drawers)

---

## 5. Core Operational Components

### 5.1 Pipeline Stepper
Horizontal multi-segment stepper placed prominently atop `/dashboard/bookings/[id]`.
* Visual representation of the 9 PRD lifecycle stages:
  1. Enquiry → 2. Consultation → 3. Deposit Request → 4. Deposit Paid → 5. Scheduled → 6. Consent Signed → 7. Session Complete → 8. Paid in Full → 9. Healed Follow-up.
* Active stage highlights in `--color-brand`; completed stages show a green checkmark (`CheckCircle2`); blocked states show a red warning indicator (`XCircle`).

### 5.2 Booking Data Table
* **Filter Bar**: Stage tab selector (`All`, `Active`, `Deposit Pending`, `Scheduled`, `Completed`), customer search input, and service type dropdown.
* **Row Elements**: Client name and avatar, service badge, stage badge, deposit & balance payment status with currency amounts, session date indicator, and direct quick-action buttons.

### 5.3 Two-Way Message Log (WhatsApp & Email)
* WhatsApp inbound and outbound bubbles formatted cleanly in chronological order with channel markers (`whatsapp` green icon vs `email` slate icon).
* Timestamps and delivery statuses displayed beneath each message.
* Outbound message trigger input allowing quick templated replies directly to the client's phone or email.

### 5.4 Safety & Gate Controls
* **Consent Guard**: A prominent visual banner blocking the "Start Session" action if the digital consent form is unsigned within 24 hours of the appointment.
* **Override Modal**: If the artist must initiate an emergency session override, a mandatory justification dialog forces the user to input the reason, which is committed to `audit_logs`.
* **Link Expiry Alert**: Amber badge flagging Razorpay payment links nearing the 72-hour window.

### 5.5 Client-Facing Portals
* **Enquiry Intake Form (`/enquiry`)**: Clean, responsive layout with progressive validation, estimated budget slider, and reference file attachment preview.
* **Digital Consent Page (`/consent/[bookingId]`)**: Plain-language legal disclosures with mandatory checkboxes for health conditions, design sign-off, photo release, and an interactive digital signature pad.
* **Post-Session Review (`/feedback/[bookingId]`)**: 5-star interactive rating component and optional healed tattoo photo upload interface.

---

## 6. Do's and Don'ts

### Do ✅
* Always display monetary values in Indian Rupees (`₹`) with commas and tabular alignment (`₹5,000`).
* Enforce explicit visual warnings whenever a session is within 24 hours and consent is unrecorded.
* Pair every status transition with an immediate visual toast notification (`sonner`) confirming CRM and database synchronization.
* Group WhatsApp and Email messages in a unified chronological stream so the artist has single-pane context.

### Don't ❌
* Do not use decorative display fonts or oversized hero elements on the operational dashboard.
* Do not allow the "Mark Complete" or "Start Session" buttons to appear active if consent status is pending without the explicit override dialog.
* Do not omit timestamps or actor identities on status change logs.
* Do not hardcode stage colors with arbitrary one-off values; strictly use the 12-stage badge tokens defined in Section 2.3.
