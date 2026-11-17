import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import {
  bookings,
  clients,
  bookingSessions,
  payments,
  consentForms,
  messages,
  auditLogs,
} from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import {
  createEnquiry,
  updateConsultationStatus,
  createDepositPaymentLink,
  handleRazorpayWebhook,
  confirmSessionDate,
  sendConsentForm,
  signConsentForm,
  createBalancePaymentLink,
  markSessionComplete,
} from "@/lib/workflows";
import { canTransitionV1, normalizeToV1Stage } from "@/lib/state-machine";
import crypto from "crypto";

describe("End-to-End Golden Path: MeetPrerna Client Lifecycle", () => {
  const testRunId = Date.now().toString().slice(-6);
  const testClientEmail = `goldenpath_${testRunId}@meetprerna-test.com`;
  const testClientPhone = `+9198765${testRunId.slice(0, 5)}`;
  const testClientName = `GoldenPath Client ${testRunId}`;
  const artistId = process.env.TEST_ARTIST_ID || process.env.DEFAULT_ARTIST_ID;

  let dbAvailable = false;
  let createdClientId: string | undefined;
  let createdBookingId: string | undefined;
  let createdConsentId: string | undefined;
  let originalFetch: typeof globalThis.fetch;

  beforeAll(async () => {
    // 1. Enforce database isolation and test artist ID to prevent modifying production/shared data
    const hasTestDbMarker =
      process.env.TEST_DATABASE === "true" ||
      Boolean(process.env.DATABASE_URL?.includes("test"));

    if (!artistId || !hasTestDbMarker) {
      console.warn(
        "Golden path test skipped: An explicit test artist ID (TEST_ARTIST_ID or DEFAULT_ARTIST_ID) and test-database marker (TEST_DATABASE=true or 'test' in DATABASE_URL) must be configured."
      );
      dbAvailable = false;
      return;
    }

    // 2. Ensure mock credentials for external services during test execution
    process.env.GOOGLE_CLIENT_ID ||= "mock_google_client_id";
    process.env.GOOGLE_CLIENT_SECRET ||= "mock_google_client_secret";
    process.env.GOOGLE_REFRESH_TOKEN ||= "mock_google_refresh_token";
    process.env.RAZORPAY_KEY_ID ||= "mock_rzp_key";
    process.env.RAZORPAY_KEY_SECRET ||= "mock_rzp_secret";
    process.env.RESEND_API_KEY ||= "mock_resend_key";
    process.env.WHATSAPP_ACCESS_TOKEN ||= "mock_wa_token";
    process.env.WHATSAPP_PHONE_NUMBER_ID ||= "mock_wa_phone_id";

    // 3. Stub external service HTTP calls to prevent sending real notifications or hitting external APIs
    originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      // Stub Razorpay payment links
      if (urlStr.includes("api.razorpay.com/v1/payment_links")) {
        return new Response(
          JSON.stringify({
            id: "plink_test_mock_12345",
            short_url: "https://rzp.io/i/test_mock_12345",
            long_url: "https://api.razorpay.com/payment_links/plink_test_mock_12345",
            status: "created",
            amount: 500000,
            currency: "INR",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Stub Google OAuth token exchange
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        return new Response(
          JSON.stringify({
            access_token: "mock_google_access_token",
            expires_in: 3600,
            token_type: "Bearer",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Stub Google Calendar event creation
      if (urlStr.includes("googleapis.com/calendar/v3")) {
        return new Response(
          JSON.stringify({
            id: "mock_gcal_event_12345",
            htmlLink: "https://calendar.google.com/event?eid=mock123",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Stub Resend email delivery
      if (urlStr.includes("api.resend.com")) {
        return new Response(
          JSON.stringify({
            id: "mock_email_123",
            from: "booking@example.com",
            to: ["test@example.com"],
            created_at: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Stub WhatsApp Cloud API
      if (urlStr.includes("graph.facebook.com")) {
        return new Response(
          JSON.stringify({
            messaging_product: "whatsapp",
            contacts: [{ input: "919876500000", wa_id: "919876500000" }],
            messages: [{ id: "wamid_mock_123" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Stub HubSpot API
      if (urlStr.includes("api.hubapi.com")) {
        return new Response(
          JSON.stringify({
            id: "mock_hubspot_id_123",
            properties: {},
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return originalFetch(input, init);
    }) as typeof globalThis.fetch;

    try {
      await db.execute(sql`SELECT 1`);
      dbAvailable = true;
    } catch {
      console.warn("Database connection unavailable in current sandbox environment. Live DB assertions skipped.");
    }
  });

  afterAll(async () => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    }

    if (!dbAvailable) return;

    // Resolve client ID and booking ID even if an assertion failed before variables were assigned
    let clientIdToDelete = createdClientId;
    let bookingIdToDelete = createdBookingId;

    try {
      if (!clientIdToDelete) {
        const [foundClient] = await db
          .select({ id: clients.id })
          .from(clients)
          .where(eq(clients.email, testClientEmail));
        if (foundClient) {
          clientIdToDelete = foundClient.id;
        }
      }
    } catch (e) {
      console.warn("Failed to lookup client by email during cleanup", e);
    }

    try {
      if (!bookingIdToDelete && clientIdToDelete) {
        const [foundBooking] = await db
          .select({ id: bookings.id })
          .from(bookings)
          .where(eq(bookings.clientId, clientIdToDelete));
        if (foundBooking) {
          bookingIdToDelete = foundBooking.id;
        }
      }
    } catch (e) {
      console.warn("Failed to lookup booking by client ID during cleanup", e);
    }

    // Clean up test entities in foreign key dependency order, attempting each deletion even if another throws
    if (bookingIdToDelete) {
      try {
        await db.delete(auditLogs).where(eq(auditLogs.bookingId, bookingIdToDelete));
      } catch (e) {
        console.warn("Cleanup error (auditLogs):", e);
      }
      try {
        await db.delete(messages).where(eq(messages.bookingId, bookingIdToDelete));
      } catch (e) {
        console.warn("Cleanup error (messages):", e);
      }
      try {
        await db.delete(consentForms).where(eq(consentForms.bookingId, bookingIdToDelete));
      } catch (e) {
        console.warn("Cleanup error (consentForms):", e);
      }
      try {
        await db.delete(payments).where(eq(payments.bookingId, bookingIdToDelete));
      } catch (e) {
        console.warn("Cleanup error (payments):", e);
      }
      try {
        await db.delete(bookingSessions).where(eq(bookingSessions.bookingId, bookingIdToDelete));
      } catch (e) {
        console.warn("Cleanup error (bookingSessions):", e);
      }
      try {
        await db.delete(bookings).where(eq(bookings.id, bookingIdToDelete));
      } catch (e) {
        console.warn("Cleanup error (bookings):", e);
      }
    }

    if (clientIdToDelete) {
      try {
        await db.delete(clients).where(eq(clients.id, clientIdToDelete));
      } catch (e) {
        console.warn("Cleanup error (clients):", e);
      }
    }
  });

  // =========================================================================
  // STEP 1: Prospective Collector Submits Enquiry via Public Form
  // =========================================================================
  it("Step 1: Should ingest new client enquiry and initialize CRM records", async () => {
    if (!dbAvailable || !artistId) {
      expect(true).toBe(true);
      return;
    }
    const enquiryResult = await createEnquiry(
      {
        name: testClientName,
        email: testClientEmail,
        phone: testClientPhone,
        serviceType: "Tattoo",
        city: "Mumbai",
        dateOfBirth: "1998-04-12",
        gender: "Female",
        tattooTimeline: "Within 1-2 Months",
        instagramHandle: "@goldenpath_collector",
        message: "Fine-line botanical sleeve with delicate stippling",
        designDescription: "Botanical orchid branch wrapping inner forearm",
        referenceImages: ["https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28"],
        estimatedBudget: 25000,
      },
      artistId
    );

    expect(enquiryResult.ok).toBe(true);
    expect(enquiryResult.bookingId).toBeDefined();
    createdBookingId = enquiryResult.bookingId;

    // Verify DB Booking record
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, createdBookingId!));

    expect(booking).toBeDefined();
    expect(booking.stage).toBe("enquiry");
    expect(normalizeToV1Stage(booking.stage)).toBe("new_enquiry");
    expect(booking.serviceType).toBe("Tattoo");
    createdClientId = booking.clientId;

    // Verify DB Client record
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, createdClientId));

    expect(client).toBeDefined();
    expect(client.email).toBe(testClientEmail);
    expect(client.name).toBe(testClientName);

    // Verify Audit Trail
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.bookingId, createdBookingId!));

    expect(logs.some((l) => l.action === "enquiry.created")).toBe(true);
  }, 15000);

  // =========================================================================
  // STEP 2: Artist Reviews & Schedules Consultation
  // =========================================================================
  it("Step 2: Should schedule consultation session and qualify prospective client", async () => {
    if (!dbAvailable || !artistId) {
      expect(true).toBe(true);
      return;
    }
    expect(createdBookingId).toBeDefined();

    // 2a. Prerna schedules a 30-min Consultation meeting on the calendar (Session 1)
    const consultationStart = new Date(Date.now() + 86400000 * 2); // 2 days later
    const consultationEnd = new Date(consultationStart.getTime() + 30 * 60000);

    const [session] = await db
      .insert(bookingSessions)
      .values({
        id: crypto.randomUUID(),
        bookingId: createdBookingId!,
        sessionNumber: 1,
        scheduledStart: consultationStart,
        scheduledEnd: consultationEnd,
        durationMinutes: 30,
        status: "scheduled",
        notes: "[Consultation] Discuss forearm sizing and placement curvature",
      })
      .returning();

    expect(session).toBeDefined();
    expect(session.sessionNumber).toBe(1);
    expect(session.notes).toContain("[Consultation]");
    expect(session.durationMinutes).toBe(30);

    // 2b. Artist qualifies client after consultation
    const qualifyResult = await updateConsultationStatus(
      createdBookingId!,
      "qualified",
      "Client is a great fit for fine-line botanical style",
      artistId
    );

    expect(qualifyResult.ok).toBe(true);

    const [updatedBooking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, createdBookingId!));

    expect(updatedBooking.stage).toBe("deposit_requested");
    expect(normalizeToV1Stage(updatedBooking.stage)).toBe("deposit_pending");
  }, 15000);

  // =========================================================================
  // STEP 3: Deposit Payment Request & Simulated Razorpay Settlement
  // =========================================================================
  it("Step 3: Should issue deposit payment link and settle via Razorpay webhook", async () => {
    if (!dbAvailable || !artistId) {
      expect(true).toBe(true);
      return;
    }
    expect(createdBookingId).toBeDefined();

    const depositAmountPaise = 500000; // ₹5,000

    // 3a. Generate Deposit Payment Link directly via workflow (without try/catch fallback)
    const linkResult = await createDepositPaymentLink(
      createdBookingId!,
      depositAmountPaise,
      artistId
    );

    expect(linkResult.ok).toBe(true);

    const [depositPendingBooking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, createdBookingId!));

    expect(depositPendingBooking.stage).toBe("deposit_pending");

    // 3b. Simulate Razorpay payment captured callback
    const [paymentRecord] = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, createdBookingId!));

    expect(paymentRecord).toBeDefined();

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "mock_webhook_secret_testing_67890";
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

    const rawPayload = JSON.stringify({
      entity: "event",
      account_id: "acc_test_123",
      event: "payment.captured",
      contains: ["payment", "payment_link"],
      payload: {
        payment: {
          entity: {
            id: `pay_${Date.now()}`,
            amount: depositAmountPaise,
            currency: "INR",
            status: "captured",
            created_at: Math.floor(Date.now() / 1000),
          },
        },
        payment_link: {
          entity: {
            id: paymentRecord.providerRef || "plink_test_mock_12345",
            reference_id: createdBookingId!,
            status: "paid",
          },
        },
      },
    });

    const validSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawPayload)
      .digest("hex");

    const webhookResult = await handleRazorpayWebhook(rawPayload, validSignature);
    expect(webhookResult.ok).toBe(true);

    // 3c. Verify booking stage transitioned to deposit_paid
    const [paidBooking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, createdBookingId!));

    expect(paidBooking.stage).toBe("deposit_paid");
    expect(paidBooking.depositPaidAt).not.toBeNull();
  }, 15000);

  // =========================================================================
  // STEP 4: Schedule Core In-Studio Tattoo Session
  // =========================================================================
  it("Step 4: Should lock appointment slot on studio calendar and transition to scheduled", async () => {
    if (!dbAvailable || !artistId) {
      expect(true).toBe(true);
      return;
    }
    expect(createdBookingId).toBeDefined();

    const sessionStart = new Date(Date.now() + 86400000 * 7); // 7 days later
    const sessionEnd = new Date(sessionStart.getTime() + 180 * 60000); // 3-hour session

    // 4a. Call confirmSessionDate directly without try/catch fallback
    const confirmResult = await confirmSessionDate(
      createdBookingId!,
      { start: sessionStart, end: sessionEnd },
      artistId
    );
    expect(confirmResult.ok).toBe(true);

    // 4b. Insert scheduled core tattoo session with sequential sessionNumber 2 to avoid collision with consultation session 1
    const [tattooSession] = await db
      .insert(bookingSessions)
      .values({
        id: crypto.randomUUID(),
        bookingId: createdBookingId!,
        sessionNumber: 2,
        scheduledStart: sessionStart,
        scheduledEnd: sessionEnd,
        durationMinutes: 180,
        status: "scheduled",
        notes: "[Tattoo Session #1] Botanical forearm piece",
      })
      .returning();

    expect(tattooSession).toBeDefined();
    expect(tattooSession.sessionNumber).toBe(2);

    const [scheduledBooking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, createdBookingId!));

    expect(scheduledBooking.stage).toBe("scheduled");
    expect(normalizeToV1Stage(scheduledBooking.stage)).toBe("confirmed_scheduled");
    expect(scheduledBooking.sessionDuration).toBe(180);
  }, 15000);

  // =========================================================================
  // STEP 5: Digital Tattoo Consent & Health Disclosures Workflow
  // =========================================================================
  it("Step 5: Should initialize, review, and digitally sign legal consent waiver", async () => {
    if (!dbAvailable || !artistId) {
      expect(true).toBe(true);
      return;
    }
    expect(createdBookingId).toBeDefined();

    // 5a. Dispatch consent form URL to collector
    const consentResult = await sendConsentForm(
      createdBookingId!,
      `https://meetprerna.com/consent/${createdBookingId}`
    );

    expect(consentResult.ok).toBe(true);
    expect(consentResult.consentId).toBeDefined();
    createdConsentId = consentResult.consentId;

    // 5b. Client signs on studio iPad with full medical declarations
    const signResult = await signConsentForm(
      createdBookingId!,
      {
        legalName: testClientName,
        ageConfirmed: true,
        allergies: "None",
        medicalConditions: "None",
        pregnantOrNursing: false,
        skinConditions: "Healthy unbroken skin",
        procedureAcknowledgement: true,
        photoConsent: true,
        marketingConsent: true,
        signatureDataUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==",
        signedAt: new Date().toISOString(),
      },
      "127.0.0.1",
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"
    );

    expect(signResult.ok).toBe(true);

    // Verify Consent Record in DB with strengthened assertions
    const [consent] = await db
      .select()
      .from(consentForms)
      .where(eq(consentForms.id, createdConsentId!));

    expect(consent).toBeDefined();
    expect(consent.signedAt).not.toBeNull();
    expect(consent.formData).not.toBeNull();

    const parsedFormData =
      typeof consent.formData === "string"
        ? (JSON.parse(consent.formData) as Record<string, unknown>)
        : (consent.formData as Record<string, unknown> | null);

    expect(parsedFormData).toBeDefined();
    expect(parsedFormData?.legalName).toBe(testClientName);
  }, 15000);

  // =========================================================================
  // STEP 6: Tattoo Session Completion & Lifecycle Closure
  // =========================================================================
  it("Step 6: Should mark tattoo session complete and close booking lifecycle", async () => {
    if (!dbAvailable || !artistId) {
      expect(true).toBe(true);
      return;
    }
    expect(createdBookingId).toBeDefined();

    // 6a. Artist marks tattoo session complete
    const completionResult = await markSessionComplete(createdBookingId!, 180, artistId);
    expect(completionResult.ok).toBe(true);

    // 6b. Update scheduled tattoo session status to completed
    await db
      .update(bookingSessions)
      .set({ status: "completed" })
      .where(eq(bookingSessions.bookingId, createdBookingId!));

    const [completedBooking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, createdBookingId!));

    expect(completedBooking.stage).toBe("session_complete");
    expect(normalizeToV1Stage(completedBooking.stage)).toBe("session_completed");

    // 6c. Verify Complete Chronological Audit Trail
    const finalAuditTrail = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.bookingId, createdBookingId!))
      .orderBy(desc(auditLogs.createdAt));

    const actions = finalAuditTrail.map((a) => a.action);

    expect(actions).toContain("enquiry.created");
    expect(actions).toContain("consultation.status");
    expect(actions).toContain("consent.sent");
    expect(actions).toContain("consent.signed");
    expect(actions).toContain("session.completed");
  }, 15000);
});
