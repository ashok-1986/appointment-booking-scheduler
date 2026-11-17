# MEETPRERNA Product Requirements Document (PRD)
**Product:** Tattoo Artist Booking & Client Management Dashboard  
**Version:** V1.0  
**Status:** Proposed – Product Manager Review  
**Primary user:** Prerna, Tattoo Artist  
**Platform:** Responsive Web Application, optimised for desktop and iPad

---

## 1. Product Vision

Build a centralised tattoo business management system that enables Prerna to manage customers, enquiries, tattoo bookings, appointments, consent forms, photographs, payments and client communication from one dashboard.

The system must reduce manual administration, prevent missed appointments and paperwork, and maintain a complete history of every customer and tattoo project.

**Core principle:** Prerna controls the booking process. Customers submit enquiries and confirm details, but appointment scheduling and calendar management remain under Prerna's control.

## 2. Current Dashboard Problems

The following are confirmed deficiencies reported by the product owner:

| ID | Problem | Required outcome |
|---|---|---|
| CD-01 | No customer profile view | Individual customer profile with complete history |
| CD-02 | No usable customer consent workflow | Digital consent, iPad signature and saved document |
| CD-03 | No post-tattoo image management | Upload and store images against the customer and booking |
| CD-04 | Missing WhatsApp nudges | Automated communication at relevant lifecycle stages |
| CD-05 | No artist-controlled calendar experience | Prerna creates and manages appointments |
| CD-06 | Missing form submission date/time | Record and display exact enquiry submission timestamp |

The current implementation of these features must be audited before development. Their absence is based on the reported feedback, not an independent technical inspection.

## 3. Target Users and Roles

### 3.1 Artist – Prerna
- View and manage all customers.
- Review enquiries and references.
- Record consultation notes.
- Create quotes and payment requests.
- Book and reschedule appointments.
- Manage consent forms.
- Upload tattoo photographs.
- Track payments and follow-ups.

### 3.2 Customer
- Submit an enquiry.
- Share reference images.
- Receive WhatsApp messages.
- Confirm appointment details.
- Sign consent on the studio iPad.
- Receive payment and aftercare instructions.

Customers do not have access to the internal dashboard.

### 3.3 Studio Administrator
Optional future role with restricted permissions for customer and appointment administration.

## 4. Product Architecture and Navigation

The main dashboard should contain:

1. Overview
2. Enquiries & Bookings
3. Customers
4. Calendar
5. Consent Forms
6. Tattoo Gallery
7. Payments
8. Communication History
9. Settings

The artist should be able to access the most important actions without navigating through multiple screens.

## 5. Functional Requirements

### FR-01: Customer Profile Management – P0

Every enquiry must create or update a customer record.

The customer profile must contain:

**Personal information**
- Full name
- Email address
- Mobile number
- Customer ID
- First enquiry date and time
- Most recent enquiry date
- New or returning customer designation

**Tattoo information**
- Tattoo idea and description
- Placement
- Approximate size
- Style
- Reference images
- Consultation notes
- Approved design, where applicable

**Booking information**
- Booking history
- Upcoming appointments
- Completed sessions
- Rescheduling history
- Cancellation history

**Documents and media**
- Signed consent forms
- Tattoo photographs
- Healed photographs
- Uploaded references
- Relevant customer documents

**Financial information**
- Quoted amount
- Deposit paid
- Outstanding balance
- Payment history

**Acceptance criteria**
- Every customer has one unique profile.
- Multiple enquiries can be associated with the same customer.
- Customer records are searchable by name, email and phone.
- Selecting a customer opens their complete history.
- All bookings, payments, documents and photographs link to the correct customer.

### FR-02: Enquiry Form and Submission Timestamp – P0

Capture:
- Full name
- Email
- Phone number
- Tattoo description
- Reference images
- Placement
- Approximate size
- Preferred budget
- Preferred appointment period

System requirements:
- Store the original submission timestamp.
- Display date and time in the dashboard.
- Store timestamps in UTC and display them in the configured local timezone.
- Distinguish original submission time from subsequent profile updates.
- Show the elapsed time since enquiry submission.
- Flag potential duplicate submissions.

**Acceptance criteria:** Every enquiry displays its original submission date and time, even after subsequent edits.

### FR-03: Digital Tattoo Consent – P0

This is a mandatory feature.

The consent form must be accessible from the customer profile and the relevant booking/session.

**Artist workflow:**
1. Prerna opens the customer profile.
2. Selects the upcoming tattoo appointment.
3. Opens the consent form on her iPad.
4. The customer reviews the consent information.
5. The customer completes the required questions.
6. The customer signs using the iPad touchscreen.
7. The system saves the signed document.
8. The dashboard updates the consent status to Signed.

**Consent form fields:**
- Legal name
- Date of birth / age verification
- Contact details
- Relevant health disclosures
- Allergies and relevant skin conditions
- Tattoo description and placement
- Procedure and risk acknowledgement
- Client confirmation and signature
- Date and time of signing

**Separate permissions:**
- Consent to the tattoo procedure.
- Permission to take photographs.
- Permission to use photographs for marketing and social media.

Photography and marketing permissions must be independently selectable.

**System requirements:**
- Signature must be captured through touchscreen input.
- Generate a downloadable PDF.
- Store the signed document securely.
- Link the document to the customer and appointment.
- Record signer, timestamp, consent template version and document status.
- Prevent accidental overwriting of previously signed documents.
- Allow Prerna to retrieve historical consent documents.

**Session protection:** A tattoo session cannot be marked as Started unless the required consent is signed. Any exceptional override must record the reason and responsible user, subject to an approved policy.

### FR-04: Tattoo Image Upload and Gallery – P0

Prerna must be able to upload photographs directly from her device, including iPad and desktop.

Images should be associated with:
- Customer
- Tattoo project
- Specific appointment/session
- Upload date and time
- Image category

Image categories:
1. Reference images
2. Design concepts
3. Before-session photographs
4. Fresh tattoo photographs
5. Healed tattoo photographs
6. Touch-up photographs

**Acceptance criteria**
- Support multiple image uploads.
- Preview images before saving.
- Store images securely.
- Display images in chronological order.
- Allow authorised users to view and download images.
- Record the upload timestamp.
- Respect the customer's separate photography and marketing permissions.
- Allow deletion or restricted access according to the retention policy.

The gallery is an internal customer-history feature, not automatically a public portfolio.

### FR-05: Artist-Controlled Calendar – P0

The calendar belongs to Prerna.

Customers must not directly select or reserve available appointment slots in V1.

**Artist workflow:**
1. Open Calendar.
2. Select an available date.
3. Select the appointment start time.
4. Set expected duration.
5. Associate the appointment with a customer.
6. Add tattoo/project details.
7. Save the appointment.
8. Send appointment confirmation through WhatsApp.

**Calendar views**
- Month
- Week
- Day
- Agenda/list

**Appointment details**
- Customer name
- Phone number
- Tattoo description
- Placement
- Session duration
- Appointment status
- Deposit status
- Consent status
- Notes

**Calendar rules**
- Prevent overlapping appointments.
- Allow configurable working hours.
- Support breaks and unavailable periods.
- Support manual rescheduling.
- Maintain appointment change history.
- Synchronise with the selected external calendar, if configured.
- Do not automatically expose availability to customers.

### FR-06: WhatsApp Automation – P0

WhatsApp should be the primary client communication channel, with email as a supporting channel.

Automated messages should be triggered by lifecycle events rather than indiscriminately sent at every status change.

**Required communication events:**

| Event | Message |
|---|---|
| Enquiry received | Acknowledgement |
| Consultation required | Consultation follow-up |
| Deposit requested | Payment link |
| Deposit received | Payment confirmation |
| Appointment scheduled | Appointment confirmation |
| 48 hours before appointment | Reminder |
| 24 hours before appointment | Preparation reminder |
| Consent pending | Consent reminder |
| Session completed | Thank-you and aftercare |
| Balance outstanding | Payment reminder |
| Follow-up date reached | Healed-photo request |
| Feedback requested | Feedback message |

**Automation requirements**
- Use approved WhatsApp Business templates where required.
- Record sent, delivered, read and failed statuses where supported.
- Associate messages with the customer and relevant booking.
- Avoid duplicate messages.
- Allow Prerna to manually send messages.
- Allow reminders to be paused or cancelled.
- Provide a communication history.

The system must respect WhatsApp's messaging rules and customer opt-in requirements.

### FR-07: Booking and Payment Management – P0

Maintain the original PRD's Razorpay integration.

**Deposit**
- Prerna creates a payment request.
- System generates a Razorpay payment link.
- Customer receives the link.
- Successful payment updates the booking.
- Receipt is generated.

**Balance**
- Prerna initiates the remaining payment request.
- System calculates the outstanding amount.
- Razorpay confirms payment.
- Booking financial status updates automatically.

All transactions must be linked to the customer and booking.

Use verified webhooks and idempotent processing.

### FR-08: Aftercare and Follow-up – P1

After session completion:
- Send the approved aftercare document.
- Record the delivery event.
- Schedule configurable follow-up messages.
- Request healed photographs.
- Request feedback.
- Allow Prerna to snooze or cancel follow-ups.

## 6. Booking Pipeline

Use seven primary pipeline stages:

| Stage | Definition |
|---|---|
| New Enquiry | Form received |
| Consultation & Review | Artist reviewing requirements |
| Deposit Pending | Payment requested |
| Confirmed / Scheduled | Artist has booked the appointment |
| Session Completed | Tattoo session completed |
| Payment Pending | Outstanding balance |
| Closed / Follow-up | Financial and operational closure |

Additional statuses should be attributes, not additional pipeline stages.

Examples:
- Consultation: Pending / In Progress / Qualified / Not Suitable
- Deposit: Not Requested / Pending / Paid / Expired
- Appointment: Proposed / Scheduled / Rescheduled / Cancelled
- Consent: Not Started / Pending / Signed / Requires Review
- Session: Not Started / In Progress / Completed
- Balance: Pending / Paid / Overdue
- Follow-up: Scheduled / Sent / Completed / Snoozed

Cancelled and unsuitable enquiries must be recorded with closure reasons.

## 7. Core User Journeys

### Journey A: New Customer
Enquiry → Profile creation → Consultation → Quote → Deposit → Artist schedules appointment → Confirmation.

### Journey B: Appointment Day
Prerna opens booking → Opens customer profile → Opens consent form on iPad → Customer signs → Consent saved → Prerna verifies readiness → Session starts.

### Journey C: Post-Tattoo
Session completed → Prerna uploads photographs → Aftercare sent → Balance requested → Payment confirmed → Follow-up scheduled.

### Journey D: Returning Customer
Existing customer identified → Previous profile retrieved → New tattoo project created → New booking and session associated with existing customer.

## 8. Data Model

The system should distinguish the following entities:

1. **Customer:** One person and their contact information.
2. **Enquiry:** An individual request submitted by a customer.
3. **Tattoo Project:** The creative work being undertaken.
4. **Booking:** An agreed appointment arrangement.
5. **Session:** An individual tattoo appointment within a project.
6. **Consent Record:** A signed, versioned legal document.
7. **Media Asset:** Reference, design, fresh or healed photograph.
8. **Payment:** Deposit, balance, refund or adjustment.
9. **Message:** Communication and delivery history.
10. **Activity Log:** Status changes, uploads and important actions.

Relationship principle:

One customer can have multiple enquiries, projects and bookings. One project can have multiple sessions. Each session can have its own consent record, media and payment references.

## 9. Technical Integrations

Retain the original PRD's proposed architecture:

- HubSpot: CRM and customer/deal tracking.
- Razorpay: Payment links and transaction webhooks.
- WhatsApp Business API: Client communication.
- Transactional email service: Receipts, documents and fallback communication.
- Calendar service: Artist calendar synchronisation.
- Secure file storage: Consent PDFs and tattoo photographs.
- Booking dashboard: Primary artist-facing application.

The product manager must verify the existing implementation and decide which existing integrations can be retained.

Avoid maintaining two competing sources of truth for booking status.

## 10. Non-Functional Requirements

- Responsive desktop and iPad experience.
- Secure authentication and role-based access.
- Encrypted document and media storage.
- Secure handling of sensitive health disclosures.
- Reliable backup and recovery.
- Timestamped audit history.
- Idempotent payment processing.
- Error logging and retry mechanisms.
- No storage of card details.
- Explicit access controls for customer documents and images.
- Defined data retention and deletion policies.

## 11. Success Metrics

Track the following:

- Enquiry-to-consultation conversion.
- Consultation-to-deposit conversion.
- Enquiry response time.
- Deposit collection time.
- Number of missed appointments.
- Consent completion rate before sessions.
- Number of sessions with complete records.
- Outstanding balances.
- Repeat customer rate.
- Percentage of automated messages successfully delivered.

Establish baseline figures before defining numeric targets.

## 12. Out of Scope for V1

- Multi-artist resource management.
- Customer self-service appointment booking.
- Native iOS and Android applications.
- Automated design generation.
- Advanced marketing automation.
- Public customer gallery.
- Automated refund processing.
- Complex accounting and tax reporting.

## 13. Product Priorities

**P0 – Required for V1 launch**
- Customer profiles.
- Enquiry management and timestamps.
- Seven-stage booking pipeline.
- Artist-controlled calendar.
- Digital consent and iPad signature.
- Consent document storage.
- Tattoo photograph uploads.
- WhatsApp lifecycle messages.
- Deposit and balance tracking.
- Session completion and aftercare.
- Audit history.

**P1 – Post-launch enhancement**
- Healed-photo follow-ups.
- Feedback and rating collection.
- Repeat customer insights.
- Advanced revenue reporting.
- Design approval and revision tracking.
- Touch-up management.

## 14. Dependencies and Risks

- HubSpot API permissions and data mapping.
- WhatsApp Business API access and template approval.
- Razorpay payment webhook reliability.
- Calendar integration and conflict handling.
- Secure document and image storage.
- Legal review of consent wording.
- Privacy and retention policies.
- iPad signature usability and device compatibility.

## 15. Product Manager Deliverables

Before engineering begins, the product manager must produce:

1. Current dashboard functionality audit.
2. Approved user stories and acceptance criteria.
3. Screen-by-screen wireframes.
4. Customer, booking and session data model.
5. HubSpot pipeline and property mapping.
6. WhatsApp message templates and trigger matrix.
7. Consent form design and document lifecycle.
8. Calendar interaction and scheduling rules.
9. API and integration specifications.
10. Test cases and UAT checklist.
11. Migration plan for existing customer records.
12. V1 release and rollback plan.

## 16. Definition of Done

V1 is ready for acceptance when:

- Prerna can find and open any customer profile.
- Every enquiry displays its original submission timestamp.
- Prerna can create and manage appointments through her calendar.
- Customers cannot self-book appointments.
- A customer can sign the correct consent form on Prerna's iPad.
- The signed document is saved against the correct booking.
- Prerna can upload and retrieve tattoo photographs.
- Relevant WhatsApp messages are triggered and logged.
- Payments update correctly after verified Razorpay webhooks.
- An unsigned consent form prevents session start.
- Customer, booking, session and payment histories remain correctly linked.
- The complete workflow passes end-to-end user acceptance testing.

**Final product principle:** One customer profile, multiple tattoo projects, multiple sessions, complete documentation and one artist-controlled operational dashboard.