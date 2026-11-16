# Product Requirements Document: Artist Appointment Booking Workflow and Management Dashboard

## 1. Purpose Statement

This document defines the requirements for an end-to-end appointment booking workflow for artists (for example, tattoo artists or commission-based visual artists) and an accompanying management dashboard. The system manages the full client lifecycle: enquiry, consultation, deposit collection, scheduling, consent management, session completion, balance payment, and post-session follow-up.

The primary objectives are:

- Reduce manual coordination effort for the artist by automating confirmations, reminders, and payment requests.
- Provide the client with clear, timely communication at every stage through email and WhatsApp.
- Maintain a single source of truth for booking status in HubSpot, with payments handled by Razorpay.
- Give the artist a dashboard that shows every booking, its current stage, and the next required action.

Success will be measured by reduced time from enquiry to scheduled session, on-time deposit and balance payments, and zero missed consent or aftercare communications.

## 2. Roles and Systems

| Role | Description |
| --- | --- |
| Client | Person requesting an appointment or commission. |
| Artist | Service provider who reviews enquiries, conducts consultations, and delivers the session. |
| Studio Admin (optional) | Assistant who can perform artist actions on the dashboard. |

| System | Purpose |
| --- | --- |
| Enquiry form (web) | Structured intake of client requests. |
| HubSpot CRM | Record of every booking, pipeline stages, contact timeline, and status tracking. |
| Razorpay | Payment links, payment capture, and webhooks for deposit and balance payments. |
| WhatsApp Business API | Two-way consultation chat and automated outbound messages. |
| Email service (transactional) | Confirmation emails, documents, and reminders. |
| Booking Dashboard (new) | Internal web application for the artist to manage all bookings. |

## 3. Workflow Stages

Each stage below defines the responsible party, the automation, and the acceptance criteria.

### Stage 1: Enquiry

Responsible party: Client (submits form); System (confirms).

The client completes a web enquiry form capturing: name, email, phone number, service type, design description or reference images, preferred date range, and estimated budget. On submission, the system creates a HubSpot contact and deal, assigns the deal to the "Enquiry" pipeline stage, and sends a confirmation email to the client acknowledging receipt with an expected response time. The artist receives a dashboard notification of a new enquiry.

Acceptance criteria:

1. Submission creates exactly one HubSpot contact and one deal with all form fields mapped to deal or contact properties.
2. Client receives a confirmation email within 2 minutes of submission.
3. Duplicate phone numbers or emails are flagged on the dashboard rather than creating duplicate deals.
4. Form validation rejects submissions missing name, email, or phone.

### Stage 2: WhatsApp Chat and Consultation

Responsible party: Artist (responds); System (logs and tracks status).

The artist opens a WhatsApp conversation with the client from the dashboard or replies in WhatsApp directly. All messages are logged to the HubSpot contact timeline. HubSpot deal status is updated manually or via a quick-action button to one of: "In Consultation", "Qualified", or "Not a Fit". When the artist marks the enquiry "Qualified", the deal moves to the "Deposit Requested" pipeline stage automatically.

Acceptance criteria:

1. Every WhatsApp message (inbound and outbound) appears on the HubSpot contact timeline within 1 minute.
2. Status changes are recorded with a timestamp and the acting user.
3. The artist can move a deal to "Not a Fit" with an optional reason, which closes the deal and sends a polite decline email.

### Stage 3: Deposit Request

Responsible party: Artist (initiates); System (creates payment link).

From the dashboard, the artist selects the deposit amount (default configurable per service type) and triggers creation of a Razorpay payment link. The link is sent to the client by WhatsApp and email, and the deal status is set to "Deposit Pending". The link expires after a configurable period (default 72 hours); expiry triggers a dashboard reminder to the artist.

Acceptance criteria:

1. Payment link generation is a single action requiring no manual copy-paste.
2. The link is delivered on both WhatsApp and email within 1 minute of creation.
3. Link expiry produces a dashboard alert and a follow-up message to the client.

### Stage 4: Deposit Payment Confirmation

Responsible party: System (webhook); Artist (notified).

Razorpay webhooks notify the system of successful payment. The system verifies the webhook signature, matches the payment to the correct deal by payment link reference, updates the HubSpot deal to "Deposit Paid", records the amount and transaction ID, and sends the client a payment receipt. The artist receives a dashboard notification confirming the deposit.

Acceptance criteria:

1. Deal status updates to "Deposit Paid" within 60 seconds of a successful payment webhook.
2. Webhook payloads with invalid signatures are rejected and logged.
3. Retried or duplicate webhooks do not create duplicate records or duplicate receipts.
4. Failed or pending payments are visible on the dashboard with a retry action.

### Stage 5: Session Date Setting

Responsible party: Artist (proposes); System (confirms).

The artist proposes one or more session dates and times from the dashboard. The system checks the artist's calendar availability, sends the options to the client by WhatsApp and email, and books the first confirmed slot. On confirmation, the system sends a booking confirmation to the client containing date, time, studio address, preparation instructions, and a calendar invite, and updates the HubSpot deal to "Scheduled".

Acceptance criteria:

1. Only available time slots can be proposed.
2. Client confirmation updates the deal to "Scheduled" and sends the confirmation pack automatically.
3. Rescheduling by the artist or client follows the same flow and logs the change reason.
4. A reminder is sent to the client 48 hours and 24 hours before the session.

### Stage 6: Consent Form Management

Responsible party: Client (signs); System (reminds).

After scheduling, the system sends the client a digital consent form (covering health disclosures, design approval, and photo permissions). If unsigned 24 hours before the session, the system sends automated reminders via WhatsApp and email. The artist cannot mark a session as started unless the consent form is signed; the dashboard displays consent status prominently.

Acceptance criteria:

1. Consent form is delivered within 1 hour of scheduling.
2. Reminders are sent automatically at 72, 48, and 24 hours before the session if unsigned.
3. The dashboard blocks session start for unsigned consent and shows an override requiring a recorded reason.
4. Signed forms are stored and linked to the HubSpot deal.

### Stage 7: Session Completion

Responsible party: Artist (marks complete); System (sends aftercare).

When the artist marks the session complete on the dashboard, the system automatically sends the aftercare document to the client by email and WhatsApp, updates the HubSpot deal to "Session Complete", and records the completion date and session duration.

Acceptance criteria:

1. Aftercare document is delivered within 5 minutes of marking completion.
2. Deal stage and completion metadata update automatically.
3. The artist can attach session photos (with consent) to the deal record.

### Stage 8: Balance Request and Final Payment

Responsible party: Artist (initiates); System (creates and confirms link).

The artist triggers a balance payment request from the dashboard, generating a Razorpay link for the remaining amount. On successful payment webhook, the deal updates to "Paid in Full" and a final receipt is sent. If unpaid after a configurable period (default 7 days), the dashboard raises an overdue alert and the system sends an automated payment reminder.

Acceptance criteria:

1. Balance link is created and delivered in one action, mirroring Stage 3 behavior.
2. "Paid in Full" status and receipt occur within 60 seconds of the webhook.
3. Overdue balances generate dashboard alerts and automated reminders at defined intervals.

### Stage 9: Healed-Photo Request and Feedback

Responsible party: System (automated); Client (responds).

A configurable number of days after the session (default 30 days for tattoo healing), the system sends a WhatsApp message requesting healed photos and a feedback request with a short rating form. Client responses and ratings are logged to the HubSpot deal, and feedback below a configurable threshold triggers a dashboard alert for the artist to follow up personally.

Acceptance criteria:

1. The follow-up message is sent automatically on schedule and can be snoozed or cancelled by the artist.
2. Client replies are logged to the HubSpot contact timeline.
3. Low-rating feedback creates a dashboard alert within 5 minutes of submission.

## 4. User Stories

Client:

1. As a client, I submit one form and receive an immediate confirmation, so I know my enquiry was received.
2. As a client, I can discuss my design over WhatsApp and pay my deposit from a secure link, so I do not need to share card details.
3. As a client, I receive date options, confirm one, and get a confirmation with address and preparation instructions, so I arrive prepared.
4. As a client, I receive my consent form and reminders in advance, so signing is never a last-minute rush.
5. As a client, I receive aftercare instructions and a final receipt automatically, and I am invited to share healed photos and feedback later.

Artist:

1. As an artist, I see all enquiries with their stage in one dashboard, so I never lose track of a lead.
2. As an artist, I can qualify an enquiry and send a deposit link in under two minutes.
3. As an artist, I am notified the moment a deposit or balance is paid.
4. As an artist, I cannot accidentally start a session without signed consent.
5. As an artist, I am alerted to expiring links, overdue balances, and negative feedback, so I can act quickly.

## 5. Technical Requirements

1. HubSpot integration via official API: deals, contacts, pipeline stages, and timeline events. All stage transitions in Sections 3.1 to 3.9 must be reflected in HubSpot.
2. Razorpay integration: payment link creation API, webhook subscription for payment events, signature verification, and idempotent handling of duplicate webhook deliveries.
3. WhatsApp Business API integration: templated outbound messages, inbound message capture, and delivery status tracking. Message templates must be pre-approved.
4. Transactional email service with delivery and bounce tracking; all client-facing emails logged to HubSpot.
5. A booking dashboard web application with role-based access (artist, studio admin), showing a booking list with stage filters, booking detail view, and all quick actions described above.
6. Calendar service integration (for example, Google Calendar) for availability and session bookings.
7. Secure storage of consent forms and payment references; no card data is stored by the system, as Razorpay handles payment details.
8. Audit log of every automated message, status change, and payment event, with timestamps.

## 6. Out of Scope

- Refund processing workflows (manual via Razorpay dashboard in v1).
- Multi-artist scheduling optimization or resource pooling.
- Native mobile applications; the dashboard is responsive web.

## 7. Open Questions

1. Final deposit percentage per service type (proposed default: 30 percent).
2. Consent form template content and legal review owner.
3. Feedback threshold that triggers a personal follow-up (proposed default: below 4 of 5).