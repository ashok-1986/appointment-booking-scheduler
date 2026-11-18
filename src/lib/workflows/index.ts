import { db } from "@/lib/db";
import {
  bookings,
  bookingSessions,
  clients,
  payments,
  consentRecords,
  messages,
  auditLogs,
  serviceTypes,
  users,
} from "@/lib/schema";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";
import {
  createContact,
  createDeal,
  updateDealStage,
  addNote,
  logEmail,
  logMessage,
  findContactByEmail,
  findContactByPhone,
  HUBSPOT_STAGE_MAP,
} from "@/lib/services/hubspot";
import {
  createPaymentLink,
  fetchPayment,
  verifyWebhookSignature,
} from "@/lib/services/razorpay";
import {
  sendWhatsAppText,
  buildPaymentLinkMessage,
} from "@/lib/services/whatsapp";
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/services/email";
import {
  createSessionEvent,
  isSlotAvailable,
} from "@/lib/services/calendar";
import { randomUUID } from "crypto";
import { canTransitionV1, normalizeToV1Stage } from "@/lib/state-machine";
import { recordIntegrationLog } from "@/lib/services/integration-logger";

export type BookingWithClient = typeof bookings.$inferSelect & {
  client: typeof clients.$inferSelect;
};

export type AuditResult = { ok: boolean; error?: string };

async function logAudit(
  bookingId: string,
  userId: string | null,
  action: string,
  oldValue: unknown,
  newValue: unknown,
  metadata?: Record<string, unknown>
) {
  await db.insert(auditLogs).values({
    id: randomUUID(),
    bookingId,
    userId,
    action,
    oldValue: oldValue ? JSON.stringify(oldValue) : null,
    newValue: newValue ? JSON.stringify(newValue) : null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

async function sendMessage(
  bookingId: string,
  channel: "whatsapp" | "email",
  direction: "inbound" | "outbound",
  content: string,
  templateName?: string
) {
  await db.insert(messages).values({
    id: randomUUID(),
    bookingId,
    channel,
    direction,
    content,
    templateName,
  });
}

// ---------- Stage 1: Enquiry ----------

export type EnquiryInput = {
  name: string;
  email: string;
  phone: string;
  serviceType: string;
  designDescription?: string;
  referenceImages?: string[];
  preferredDateRangeStart?: Date;
  preferredDateRangeEnd?: Date;
  estimatedBudget?: number;
  city?: string;
  dateOfBirth?: string;
  gender?: string;
  tattooTimeline?: string;
  instagramHandle?: string;
  message?: string;
};

export type EnquiryResult = {
  ok: boolean;
  bookingId?: string;
  duplicate?: boolean;
  error?: string;
};

export async function createEnquiry(
  input: EnquiryInput,
  artistId: string
): Promise<EnquiryResult> {
  // 1. Resolve a valid artist ID in case the provided ID does not exist in the database
  let validArtistId = artistId;
  const artistExists = await db.query.users.findFirst({
    where: eq(users.id, artistId),
  });
  if (!artistExists) {
    const fallbackArtist = await db.query.users.findFirst();
    if (fallbackArtist) {
      validArtistId = fallbackArtist.id;
    }
  }

  // 2. Perform indexed query to find matching existing client
  const dupClient = await db.query.clients.findFirst({
    where: or(eq(clients.email, input.email), eq(clients.phone, input.phone)),
  });

  const bookingId = randomUUID();
  let clientId: string;
  let hubspotContactId: string | null = null;

  if (dupClient) {
    clientId = dupClient.id;
    hubspotContactId = dupClient.hubspotContactId;
  } else {
    clientId = randomUUID();
    await db.insert(clients).values({
      id: clientId,
      name: input.name,
      email: input.email,
      phone: input.phone,
    });
    try {
      const hs = await createContact({
        email: input.email,
        firstname: input.name.split(" ")[0],
        lastname: input.name.split(" ").slice(1).join(" "),
        phone: input.phone,
        city: input.city,
        date_of_birth: input.dateOfBirth,
        gender: input.gender,
        tattoo_timeline: input.tattooTimeline,
        instagram_handle: input.instagramHandle,
        message: input.message,
        website: input.referenceImages?.[0],
      });
      hubspotContactId = hs.id;
      await db
        .update(clients)
        .set({ hubspotContactId: hs.id })
        .where(eq(clients.id, clientId));
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "contact.create",
        status: "success",
        payload: { contactId: hs.id },
      });
    } catch (err) {
      console.error("HubSpot contact creation failed", err);
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "contact.create",
        status: "failure",
        error: err,
        payload: { email: input.email },
      });
    }
  }

  const combinedDescription = [
    input.tattooTimeline ? `Timeline: ${input.tattooTimeline}` : null,
    input.instagramHandle ? `Instagram: ${input.instagramHandle}` : null,
    input.city ? `City: ${input.city}` : null,
    input.gender ? `Gender: ${input.gender}` : null,
    input.dateOfBirth ? `DOB: ${input.dateOfBirth}` : null,
    input.message ? `Notes: ${input.message}` : null,
    input.designDescription ? `Design: ${input.designDescription}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const stage = "enquiry" as const;

  await db.insert(bookings).values({
    id: bookingId,
    clientId,
    artistId: validArtistId,
    serviceType: input.serviceType,
    designDescription: combinedDescription || input.designDescription,
    referenceImages: input.referenceImages ?? [],
    preferredDateRangeStart: input.preferredDateRangeStart,
    preferredDateRangeEnd: input.preferredDateRangeEnd,
    estimatedBudget: input.estimatedBudget
      ? BigInt(input.estimatedBudget)
      : null,
    stage,
  });

  let hubspotDealId: string | null = null;
  try {
    const deal = await createDeal({
      dealname: `${input.name} – ${input.serviceType}${input.tattooTimeline ? ` (${input.tattooTimeline})` : ""}`,
      dealstage: HUBSPOT_STAGE_MAP[stage],
      amount: input.estimatedBudget ? String(input.estimatedBudget) : undefined,
      contactId: hubspotContactId ?? undefined,
      properties: {
        service_type: input.serviceType,
        phone: input.phone,
        design_description: combinedDescription || input.designDescription,
        city: input.city,
        tattoo_timeline: input.tattooTimeline,
        instagram_handle: input.instagramHandle,
      },
    });
    hubspotDealId = deal.id;
    await db
      .update(bookings)
      .set({ hubspotDealId: deal.id })
      .where(eq(bookings.id, bookingId));
    await recordIntegrationLog({
      bookingId,
      provider: "hubspot",
      action: "deal.create",
      status: "success",
      payload: { dealId: deal.id },
    });
  } catch (err) {
    console.error("HubSpot deal creation failed", err);
    await recordIntegrationLog({
      bookingId,
      provider: "hubspot",
      action: "deal.create",
      status: "failure",
      error: err,
    });
  }

  const conf = EMAIL_TEMPLATES.enquiryConfirmation(input.name);
  try {
    await sendEmail({
      to: input.email,
      subject: conf.subject,
      html: conf.html,
      text: conf.text,
    });
    await sendMessage(bookingId, "email", "outbound", conf.text, "enquiry_confirmation");
    if (hubspotContactId) await logEmail(hubspotContactId, conf.subject, conf.text);
    await recordIntegrationLog({
      bookingId,
      provider: "email",
      action: "email.send_confirmation",
      status: "success",
      payload: { to: input.email },
    });
  } catch (err) {
    console.error("Confirmation email failed", err);
    await recordIntegrationLog({
      bookingId,
      provider: "email",
      action: "email.send_confirmation",
      status: "failure",
      error: err,
      payload: { to: input.email },
    });
  }

  await logAudit(bookingId, artistId, "enquiry.created", null, {
    serviceType: input.serviceType,
    duplicate: !!dupClient,
  });

  return { ok: true, bookingId, duplicate: !!dupClient };
}

// ---------- Stage 2: Consultation ----------

export type ConsultationStatus =
  | "in_consultation"
  | "qualified"
  | "not_a_fit";

export async function updateConsultationStatus(
  bookingId: string,
  status: ConsultationStatus,
  reason?: string,
  actorId?: string
) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { client: true },
  });
  if (!booking) return { ok: false, error: "Booking not found" };

  const newStage =
    status === "qualified" ? "deposit_requested" : status === "not_a_fit" ? "not_a_fit" : "in_consultation";

  const currentNormalized = normalizeToV1Stage(booking.stage);
  const targetNormalized = normalizeToV1Stage(newStage);
  if (currentNormalized !== targetNormalized && !canTransitionV1(booking.stage, newStage)) {
    return {
      ok: false,
      error: `Invalid state transition from '${booking.stage}' (${currentNormalized}) to '${newStage}' (${targetNormalized})`,
    };
  }

  await db
    .update(bookings)
    .set({ stage: newStage, rejectionReason: reason ?? null })
    .where(eq(bookings.id, bookingId));

  if (booking.hubspotDealId) {
    try {
      await updateDealStage(booking.hubspotDealId, HUBSPOT_STAGE_MAP[newStage], {
        rejection_reason: reason,
      });
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.stage_update",
        status: "success",
        payload: { stage: newStage },
      });
    } catch (err) {
      console.error("HubSpot stage update failed", err);
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.stage_update",
        status: "failure",
        error: err,
        payload: { stage: newStage },
      });
    }
  }

  await logAudit(bookingId, actorId ?? null, "consultation.status", booking.stage, {
    status,
    reason,
  });

  if (status === "not_a_fit") {
    const decline = EMAIL_TEMPLATES.decline(booking.client.name, reason);
    try {
      await sendEmail({
        to: booking.client.email,
        subject: decline.subject,
        html: decline.html,
        text: decline.text,
      });
      await sendMessage(bookingId, "email", "outbound", decline.text, "decline");
      await recordIntegrationLog({
        bookingId,
        provider: "email",
        action: "email.send_decline",
        status: "success",
        payload: { to: booking.client.email },
      });
    } catch (err) {
      console.error("Decline email failed", err);
      await recordIntegrationLog({
        bookingId,
        provider: "email",
        action: "email.send_decline",
        status: "failure",
        error: err,
        payload: { to: booking.client.email },
      });
    }
  }

  return { ok: true, stage: newStage };
}

// ---------- Stage 3: Deposit Request ----------

export async function createDepositPaymentLink(
  bookingId: string,
  amount: number, // paise
  actorId?: string
) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { client: true },
  });
  if (!booking) return { ok: false, error: "Booking not found" };

  const targetStage = "deposit_pending";
  const currentNormalized = normalizeToV1Stage(booking.stage);
  const targetNormalized = normalizeToV1Stage(targetStage);
  if (currentNormalized !== targetNormalized && !canTransitionV1(booking.stage, targetStage)) {
    return {
      ok: false,
      error: `Invalid state transition from '${booking.stage}' (${currentNormalized}) to '${targetStage}'`,
    };
  }

  let link;
  try {
    link = await createPaymentLink({
      amount,
      referenceId: bookingId,
      description: `Deposit for ${booking.serviceType}`,
      customer: {
        name: booking.client.name,
        email: booking.client.email,
        contact: booking.client.phone,
      },
      expirySeconds: 72 * 3600,
    });
    await recordIntegrationLog({
      bookingId,
      provider: "razorpay",
      action: "payment_link.create_deposit",
      status: "success",
      payload: { linkId: link.id, amount },
    });
  } catch (err) {
    await recordIntegrationLog({
      bookingId,
      provider: "razorpay",
      action: "payment_link.create_deposit",
      status: "failure",
      error: err,
      payload: { amount },
    });
    throw err;
  }

  const paymentId = randomUUID();
  await db.insert(payments).values({
    id: paymentId,
    bookingId,
    type: "deposit",
    amount: BigInt(amount),
    status: "created",
    providerRef: link.id,
  });

  await db
    .update(bookings)
    .set({ stage: "deposit_pending", depositAmount: BigInt(amount) })
    .where(eq(bookings.id, bookingId));

  if (booking.hubspotDealId) {
    try {
      await updateDealStage(booking.hubspotDealId, HUBSPOT_STAGE_MAP.deposit_pending);
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.stage_update",
        status: "success",
        payload: { stage: "deposit_pending" },
      });
    } catch (err) {
      console.error(err);
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.stage_update",
        status: "failure",
        error: err,
        payload: { stage: "deposit_pending" },
      });
    }
  }

  const whatsappText = buildPaymentLinkMessage(
    booking.client.name,
    amount,
    "INR",
    link.short_url,
    "deposit"
  );
  const emailTpl = EMAIL_TEMPLATES.depositLink(
    booking.client.name,
    amount,
    "INR",
    link.short_url,
    72
  );

  try {
    await sendWhatsAppText(booking.client.phone, whatsappText);
    await sendMessage(bookingId, "whatsapp", "outbound", whatsappText, "deposit_link");
    await recordIntegrationLog({
      bookingId,
      provider: "whatsapp",
      action: "whatsapp.send_deposit_link",
      status: "success",
      payload: { phone: booking.client.phone },
    });
  } catch (err) {
    console.error("WhatsApp deposit link failed", err);
    await recordIntegrationLog({
      bookingId,
      provider: "whatsapp",
      action: "whatsapp.send_deposit_link",
      status: "failure",
      error: err,
      payload: { phone: booking.client.phone },
    });
  }
  try {
    await sendEmail({
      to: booking.client.email,
      subject: emailTpl.subject,
      html: emailTpl.html,
      text: emailTpl.text,
    });
    await sendMessage(bookingId, "email", "outbound", emailTpl.text, "deposit_link");
    await recordIntegrationLog({
      bookingId,
      provider: "email",
      action: "email.send_deposit_link",
      status: "success",
      payload: { to: booking.client.email },
    });
  } catch (err) {
    console.error("Email deposit link failed", err);
    await recordIntegrationLog({
      bookingId,
      provider: "email",
      action: "email.send_deposit_link",
      status: "failure",
      error: err,
      payload: { to: booking.client.email },
    });
  }

  await logAudit(bookingId, actorId ?? null, "deposit.link_created", null, {
    paymentId,
    amount,
    linkId: link.id,
  });

  return { ok: true, paymentId, linkUrl: link.short_url };
}

// ---------- Stage 4: Deposit Payment Confirmation ----------

export type RazorpayWebhookEvent = {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment: { entity: { id: string; amount: number; currency: string; status: string; order_id?: string; method?: string; created_at: number } };
    payment_link?: { entity: { id: string; reference_id?: string; status: string; description?: string } };
  };
};

export async function handleRazorpayWebhook(
  rawBody: string,
  signature: string
): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return { ok: false, error: "Razorpay webhook secret is not configured. Set RAZORPAY_WEBHOOK_SECRET." };
  }
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    console.warn("Invalid Razorpay webhook signature");
    return { ok: false, error: "Invalid signature" };
  }

  const event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  if (event.event !== "payment.captured" && event.event !== "payment.paid") {
    return { ok: true };
  }

  const payment = event.payload.payment.entity;
  const paymentLink = event.payload.payment_link?.entity;

  const existing = await db
    .select()
    .from(payments)
    .where(
      or(
        eq(payments.providerRef, payment.id),
        eq(payments.providerPaymentId, payment.id)
      )
    );
  if (existing.length > 0) {
    return { ok: true }; // idempotent
  }

  const referenceId = paymentLink?.reference_id;
  if (!referenceId) return { ok: true };

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, referenceId),
    with: { client: true },
  });
  if (!booking) return { ok: true };

  // Look for pre-created pending payment matching this payment link
  let matchedPendingPayment = null;
  if (paymentLink?.id) {
    const matched = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.providerRef, paymentLink.id),
          eq(payments.bookingId, booking.id)
        )
      );
    if (matched.length > 0) {
      matchedPendingPayment = matched[0];
      if (matchedPendingPayment.status === "paid") {
        return { ok: true }; // already settled
      }
    }
  }

  const isBalancePayment =
    matchedPendingPayment?.type === "balance" ||
    booking.stage === "payment_pending" ||
    Boolean(
      paymentLink?.description &&
        paymentLink.description.toLowerCase().includes("balance")
    );

  const paymentType: "deposit" | "balance" = isBalancePayment ? "balance" : "deposit";
  const paymentId = matchedPendingPayment?.id || randomUUID();
  const paymentDate = new Date(payment.created_at * 1000);

  if (matchedPendingPayment) {
    await db
      .update(payments)
      .set({
        status: "paid",
        providerPaymentId: payment.id,
        paymentMethod: payment.method,
        paidAt: paymentDate,
        webhookPayload: event.payload as unknown as Record<string, unknown>,
      })
      .where(eq(payments.id, matchedPendingPayment.id));
  } else {
    await db.insert(payments).values({
      id: paymentId,
      bookingId: booking.id,
      type: paymentType,
      amount: BigInt(payment.amount),
      currency: payment.currency,
      status: "paid",
      provider: "razorpay",
      providerRef: payment.id,
      providerPaymentId: payment.id,
      paymentMethod: payment.method,
      paidAt: paymentDate,
      webhookPayload: event.payload as unknown as Record<string, unknown>,
    });
  }

  if (isBalancePayment) {
    // Balance payment handling
    await db
      .update(bookings)
      .set({
        stage: "closed_followup",
        balancePaidAt: new Date(),
        completedAt: booking.completedAt || new Date(),
      })
      .where(eq(bookings.id, booking.id));

    if (booking.hubspotDealId) {
      try {
        await updateDealStage(booking.hubspotDealId, HUBSPOT_STAGE_MAP.paid_in_full || "closedwon", {
          amount: String(payment.amount),
          balance_transaction_id: payment.id,
        });
        await recordIntegrationLog({
          bookingId: booking.id,
          provider: "hubspot",
          action: "deal.stage_update",
          status: "success",
          payload: { stage: "paid_in_full", amount: payment.amount },
        });
      } catch (err) {
        console.error("HubSpot deal update failed (balance):", err);
        await recordIntegrationLog({
          bookingId: booking.id,
          provider: "hubspot",
          action: "deal.stage_update",
          status: "failure",
          error: err,
          payload: { stage: "paid_in_full", amount: payment.amount },
        });
      }
    }

    const receipt = EMAIL_TEMPLATES.paymentReceipt(
      booking.client.name,
      payment.amount,
      payment.currency,
      payment.id,
      "balance"
    );
    try {
      await sendEmail({
        to: booking.client.email,
        subject: receipt.subject,
        html: receipt.html,
        text: receipt.text,
      });
      await sendMessage(booking.id, "email", "outbound", receipt.text, "balance_receipt");
      await recordIntegrationLog({
        bookingId: booking.id,
        provider: "email",
        action: "email.send_balance_receipt",
        status: "success",
        payload: { to: booking.client.email },
      });
    } catch (err) {
      console.error("Receipt email failed (balance):", err);
      await recordIntegrationLog({
        bookingId: booking.id,
        provider: "email",
        action: "email.send_balance_receipt",
        status: "failure",
        error: err,
        payload: { to: booking.client.email },
      });
    }

    await logAudit(booking.id, null, "balance.paid", null, {
      paymentId,
      razorpayPaymentId: payment.id,
      amount: payment.amount,
    });
  } else {
    // Deposit payment handling with stage monotonicity protection
    const preDepositStages = [
      "enquiry",
      "new_enquiry",
      "consultation",
      "in_consultation",
      "consultation_review",
      "deposit_pending",
      "deposit_requested",
    ];
    const shouldAdvanceStage = preDepositStages.includes(booking.stage);

    await db
      .update(bookings)
      .set({
        ...(shouldAdvanceStage ? { stage: "deposit_paid" } : {}),
        depositPaidAt: booking.depositPaidAt || new Date(),
        depositAmount: booking.depositAmount || BigInt(payment.amount),
      })
      .where(eq(bookings.id, booking.id));

    if (booking.hubspotDealId && shouldAdvanceStage) {
      try {
        await updateDealStage(booking.hubspotDealId, HUBSPOT_STAGE_MAP.deposit_paid, {
          amount: String(payment.amount),
          deposit_transaction_id: payment.id,
        });
        await recordIntegrationLog({
          bookingId: booking.id,
          provider: "hubspot",
          action: "deal.stage_update",
          status: "success",
          payload: { stage: "deposit_paid", amount: payment.amount },
        });
      } catch (err) {
        console.error("HubSpot deal update failed (deposit):", err);
        await recordIntegrationLog({
          bookingId: booking.id,
          provider: "hubspot",
          action: "deal.stage_update",
          status: "failure",
          error: err,
          payload: { stage: "deposit_paid", amount: payment.amount },
        });
      }
    }

    const receipt = EMAIL_TEMPLATES.paymentReceipt(
      booking.client.name,
      payment.amount,
      payment.currency,
      payment.id,
      "deposit"
    );
    try {
      await sendEmail({
        to: booking.client.email,
        subject: receipt.subject,
        html: receipt.html,
        text: receipt.text,
      });
      await sendMessage(booking.id, "email", "outbound", receipt.text, "deposit_receipt");
      await recordIntegrationLog({
        bookingId: booking.id,
        provider: "email",
        action: "email.send_deposit_receipt",
        status: "success",
        payload: { to: booking.client.email },
      });
    } catch (err) {
      console.error("Receipt email failed (deposit):", err);
      await recordIntegrationLog({
        bookingId: booking.id,
        provider: "email",
        action: "email.send_deposit_receipt",
        status: "failure",
        error: err,
        payload: { to: booking.client.email },
      });
    }

    await logAudit(booking.id, null, "deposit.paid", null, {
      paymentId,
      razorpayPaymentId: payment.id,
      amount: payment.amount,
      stageAdvanced: shouldAdvanceStage,
    });
  }

  return { ok: true };
}

// ---------- Stage 5: Session Date Setting ----------

export async function proposeSessionDates(
  bookingId: string,
  slots: Array<{ start: Date; end: Date }>,
  actorId?: string
) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { client: true },
  });
  if (!booking) return { ok: false, error: "Booking not found" };

  const available: typeof slots = [];
  for (const slot of slots) {
    if (await isSlotAvailable(slot.start, slot.end)) {
      available.push(slot);
    }
  }

  if (available.length === 0) {
    return { ok: false, error: "No available slots" };
  }

  const whatsappText = `Hi ${booking.client.name}, here are your proposed session times:\n` +
    available
      .map((s, i) => `${i + 1}. ${s.start.toLocaleString()} – ${s.end.toLocaleString()}`)
      .join("\n") +
    `\nReply with the number of your preferred slot.`;

  try {
    await sendWhatsAppText(booking.client.phone, whatsappText);
    await sendMessage(booking.id, "whatsapp", "outbound", whatsappText, "date_options");
    await recordIntegrationLog({
      bookingId,
      provider: "whatsapp",
      action: "whatsapp.send_date_options",
      status: "success",
      payload: { phone: booking.client.phone },
    });
  } catch (err) {
    console.error("WhatsApp date options failed", err);
    await recordIntegrationLog({
      bookingId,
      provider: "whatsapp",
      action: "whatsapp.send_date_options",
      status: "failure",
      error: err,
      payload: { phone: booking.client.phone },
    });
  }

  await logAudit(bookingId, actorId ?? null, "session.dates_proposed", null, {
    slots: available.map((s) => ({ start: s.start, end: s.end })),
  });

  return { ok: true, slots: available };
}

export async function confirmSessionDate(
  bookingId: string,
  slot: { start: Date; end: Date },
  actorId?: string
) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { client: true },
  });
  if (!booking) return { ok: false, error: "Booking not found" };

  const targetStage = "scheduled";
  const currentNormalized = normalizeToV1Stage(booking.stage);
  const targetNormalized = normalizeToV1Stage(targetStage);
  if (currentNormalized !== targetNormalized && !canTransitionV1(booking.stage, targetStage)) {
    return {
      ok: false,
      error: `Invalid state transition from '${booking.stage}' (${currentNormalized}) to '${targetStage}'`,
    };
  }

  let event;
  try {
    event = await createSessionEvent({
      summary: `Session – ${booking.client.name} (${booking.serviceType})`,
      description: booking.designDescription ?? undefined,
      start: slot.start,
      end: slot.end,
      attendeeEmail: booking.client.email,
      location: booking.sessionAddress ?? undefined,
    });
    await recordIntegrationLog({
      bookingId,
      provider: "calendar",
      action: "calendar.create_event",
      status: "success",
      payload: { eventId: event.id },
    });
  } catch (err) {
    await recordIntegrationLog({
      bookingId,
      provider: "calendar",
      action: "calendar.create_event",
      status: "failure",
      error: err,
    });
    throw err;
  }

  await db
    .update(bookings)
    .set({
      stage: "scheduled",
      sessionDate: slot.start,
      sessionDuration: Math.round(
        (slot.end.getTime() - slot.start.getTime()) / 60000
      ),
    })
    .where(eq(bookings.id, bookingId));

  // Create the canonical session record — the calendar reads from bookingSessions,
  // so without this row an appointment confirmed through this path never shows up.
  const existingSessionCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookingSessions)
    .where(eq(bookingSessions.bookingId, bookingId));

  await db.insert(bookingSessions).values({
    id: randomUUID(),
    bookingId,
    sessionNumber: Number(existingSessionCount[0]?.count || 0) + 1,
    scheduledStart: slot.start,
    scheduledEnd: slot.end,
    durationMinutes: Math.round((slot.end.getTime() - slot.start.getTime()) / 60000),
    status: "scheduled",
    consentStatus: "not_started",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  if (booking.hubspotDealId) {
    try {
      await updateDealStage(booking.hubspotDealId, HUBSPOT_STAGE_MAP.scheduled);
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.stage_update",
        status: "success",
        payload: { stage: "scheduled" },
      });
    } catch (err) {
      console.error(err);
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.stage_update",
        status: "failure",
        error: err,
        payload: { stage: "scheduled" },
      });
    }
  }

  const conf = EMAIL_TEMPLATES.sessionConfirmation(
    booking.client.name,
    slot.start.toLocaleString(),
    booking.sessionAddress ?? "Studio",
    booking.preparationInstructions ?? "Please arrive 10 minutes early."
  );
  try {
    await sendEmail({
      to: booking.client.email,
      subject: conf.subject,
      html: conf.html,
      text: conf.text,
    });
    await sendMessage(booking.id, "email", "outbound", conf.text, "session_confirmation");
    await recordIntegrationLog({
      bookingId,
      provider: "email",
      action: "email.send_session_confirmation",
      status: "success",
      payload: { to: booking.client.email },
    });
  } catch (err) {
    console.error("Session confirmation email failed", err);
    await recordIntegrationLog({
      bookingId,
      provider: "email",
      action: "email.send_session_confirmation",
      status: "failure",
      error: err,
      payload: { to: booking.client.email },
    });
  }

  await logAudit(bookingId, actorId ?? null, "session.confirmed", null, {
    start: slot.start,
    eventId: event.id,
  });

  return { ok: true, eventId: event.id };
}

// ---------- Stage 6: Consent Form ----------

export async function sendConsentForm(bookingId: string, formUrl: string) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { client: true },
  });
  if (!booking) return { ok: false, error: "Booking not found" };

  const consentId = randomUUID();
  await db.insert(consentRecords).values({
    id: consentId,
    bookingId,
    clientId: booking.clientId,
    status: "pending",
    reminderCount: 0,
  });

  await db
    .update(bookings)
    .set({ consentFormId: consentId })
    .where(eq(bookings.id, bookingId));

  const whatsappText = `Hi ${booking.client.name}, please review and sign your consent form before your session: ${formUrl}`;
  try {
    await sendWhatsAppText(booking.client.phone, whatsappText);
    await sendMessage(booking.id, "whatsapp", "outbound", whatsappText, "consent_form");
    await recordIntegrationLog({
      bookingId,
      provider: "whatsapp",
      action: "whatsapp.send_consent_form",
      status: "success",
      payload: { phone: booking.client.phone },
    });
  } catch (err) {
    console.error(err);
    await recordIntegrationLog({
      bookingId,
      provider: "whatsapp",
      action: "whatsapp.send_consent_form",
      status: "failure",
      error: err,
      payload: { phone: booking.client.phone },
    });
  }

  await logAudit(bookingId, null, "consent.sent", null, { formUrl });
  return { ok: true, consentId };
}

export async function signConsentForm(
  bookingId: string,
  signedData: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { client: true },
  });
  if (!booking) return { ok: false, error: "Booking not found" };

  const now = new Date();
  const legalName = typeof signedData.legalName === "string" ? signedData.legalName : undefined;
  const dateOfBirth = typeof signedData.dateOfBirth === "string" ? signedData.dateOfBirth : undefined;
  const signatureImageUrl = typeof signedData.signatureImageUrl === "string"
    ? signedData.signatureImageUrl
    : typeof signedData.signatureDataUrl === "string"
    ? signedData.signatureDataUrl
    : typeof signedData.signature === "string"
    ? signedData.signature
    : undefined;

  const healthDisclosures = (signedData.healthDisclosures as any) ?? {
    allergies: Boolean(signedData.allergies && signedData.allergies !== "None"),
    allergiesDetails: typeof signedData.allergies === "string" && signedData.allergies !== "None" ? signedData.allergies : "",
    bloodThinners: Boolean(signedData.bloodThinners),
    skinConditions: Boolean(signedData.skinConditions && signedData.skinConditions !== "Healthy unbroken skin"),
    skinConditionsDetails: typeof signedData.skinConditions === "string" ? signedData.skinConditions : "",
    pregnantOrNursing: Boolean(signedData.pregnantOrNursing),
    cardiacOrEpileptic: Boolean(signedData.cardiacOrEpileptic),
    idProofType: typeof signedData.idProofType === "string" ? signedData.idProofType : undefined,
    idProofImageUrl: typeof signedData.idProofImageUrl === "string" ? signedData.idProofImageUrl : undefined,
    idProofNumber: typeof signedData.idProofNumber === "string" ? signedData.idProofNumber : undefined,
  };

  const procedureConsent = typeof signedData.procedureConsent === "boolean"
    ? signedData.procedureConsent
    : typeof signedData.procedureAcknowledgement === "boolean"
    ? signedData.procedureAcknowledgement
    : true;

  const photographyConsent = typeof signedData.photographyConsent === "boolean"
    ? signedData.photographyConsent
    : typeof signedData.photoConsent === "boolean"
    ? signedData.photoConsent
    : false;

  const marketingConsent = typeof signedData.marketingConsent === "boolean"
    ? signedData.marketingConsent
    : false;

  const ageVerified = typeof signedData.ageVerified === "boolean"
    ? signedData.ageVerified
    : typeof signedData.ageConfirmed === "boolean"
    ? signedData.ageConfirmed
    : true;

  await db
    .update(consentRecords)
    .set({
      status: "signed",
      signedAt: now,
      legalName,
      dateOfBirth,
      ageVerified,
      procedureConsent,
      photographyConsent,
      marketingConsent,
      healthDisclosures,
      signatureImageUrl,
      signerIp: ipAddress,
      signerUserAgent: userAgent,
    })
    .where(eq(consentRecords.bookingId, bookingId));

  await db
    .update(bookings)
    .set({ consentSignedAt: now })
    .where(eq(bookings.id, bookingId));

  if (booking.hubspotDealId) {
    try {
      await addNote(booking.hubspotDealId, "Consent form signed");
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.add_note",
        status: "success",
        payload: { note: "Consent form signed" },
      });
    } catch (err) {
      console.error(err);
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.add_note",
        status: "failure",
        error: err,
        payload: { note: "Consent form signed" },
      });
    }
  }

  await logAudit(bookingId, null, "consent.signed", null, { signedData });
  return { ok: true };
}

// ---------- Stage 7: Session Completion ----------

export async function markSessionComplete(
  bookingId: string,
  durationMinutes: number,
  actorId?: string,
  photos?: string[],
  consentOverrideReason?: string
) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { client: true },
  });
  if (!booking) return { ok: false, error: "Booking not found" };

  const targetStage = "session_complete";
  const currentNormalized = normalizeToV1Stage(booking.stage);
  const targetNormalized = normalizeToV1Stage(targetStage);
  if (currentNormalized !== targetNormalized && !canTransitionV1(booking.stage, targetStage)) {
    return {
      ok: false,
      error: `Invalid state transition from '${booking.stage}' (${currentNormalized}) to '${targetStage}'`,
    };
  }

  if (!booking.consentSignedAt) {
    if (!consentOverrideReason || consentOverrideReason.trim().length === 0) {
      return {
        ok: false,
        error: "Consent form not signed. An override reason is required to proceed.",
      };
    }
    await logAudit(bookingId, actorId ?? null, "session.consent_override", null, {
      reason: consentOverrideReason,
      timestamp: new Date().toISOString(),
    });
  }

  await db
    .update(bookings)
    .set({
      stage: "session_complete",
      sessionDuration: durationMinutes,
      completedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));

  if (booking.hubspotDealId) {
    try {
      await updateDealStage(booking.hubspotDealId, HUBSPOT_STAGE_MAP.session_complete, {
        session_duration: String(durationMinutes),
      });
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.stage_update",
        status: "success",
        payload: { stage: "session_complete", sessionDuration: durationMinutes },
      });
    } catch (err) {
      console.error(err);
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.stage_update",
        status: "failure",
        error: err,
        payload: { stage: "session_complete", sessionDuration: durationMinutes },
      });
    }
  }

  const aftercare = EMAIL_TEMPLATES.aftercare(booking.client.name);
  try {
    await sendEmail({
      to: booking.client.email,
      subject: aftercare.subject,
      html: aftercare.html,
      text: aftercare.text,
    });
    await sendMessage(booking.id, "email", "outbound", aftercare.text, "aftercare");
    await recordIntegrationLog({
      bookingId,
      provider: "email",
      action: "email.send_aftercare",
      status: "success",
      payload: { to: booking.client.email },
    });
  } catch (err) {
    console.error("Aftercare email failed", err);
    await recordIntegrationLog({
      bookingId,
      provider: "email",
      action: "email.send_aftercare",
      status: "failure",
      error: err,
      payload: { to: booking.client.email },
    });
  }

  await logAudit(bookingId, actorId ?? null, "session.completed", null, {
    durationMinutes,
    photos,
  });

  return { ok: true };
}

// ---------- Stage 8: Balance Request ----------

export async function createBalancePaymentLink(
  bookingId: string,
  amount: number,
  actorId?: string
) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { client: true },
  });
  if (!booking) return { ok: false, error: "Booking not found" };

  const targetStage = "payment_pending";
  const currentNormalized = normalizeToV1Stage(booking.stage);
  const targetNormalized = normalizeToV1Stage(targetStage);
  if (currentNormalized !== targetNormalized && !canTransitionV1(booking.stage, targetStage)) {
    return {
      ok: false,
      error: `Invalid state transition from '${booking.stage}' (${currentNormalized}) to '${targetStage}'`,
    };
  }

  let link;
  try {
    link = await createPaymentLink({
      amount,
      referenceId: bookingId,
      description: `Balance for ${booking.serviceType}`,
      customer: {
        name: booking.client.name,
        email: booking.client.email,
        contact: booking.client.phone,
      },
      expirySeconds: 7 * 24 * 3600,
    });
    await recordIntegrationLog({
      bookingId,
      provider: "razorpay",
      action: "payment_link.create_balance",
      status: "success",
      payload: { linkId: link.id, amount },
    });
  } catch (err) {
    await recordIntegrationLog({
      bookingId,
      provider: "razorpay",
      action: "payment_link.create_balance",
      status: "failure",
      error: err,
      payload: { amount },
    });
    throw err;
  }

  const paymentId = randomUUID();
  await db.insert(payments).values({
    id: paymentId,
    bookingId,
    type: "balance",
    amount: BigInt(amount),
    status: "created",
    providerRef: link.id,
  });

  await db
    .update(bookings)
    .set({ stage: "payment_pending", balanceAmount: BigInt(amount) })
    .where(eq(bookings.id, bookingId));

  const whatsappText = buildPaymentLinkMessage(
    booking.client.name,
    amount,
    "INR",
    link.short_url,
    "balance"
  );
  const emailTpl = EMAIL_TEMPLATES.balanceLink(
    booking.client.name,
    amount,
    "INR",
    link.short_url,
    7
  );

  try {
    await sendWhatsAppText(booking.client.phone, whatsappText);
    await sendMessage(booking.id, "whatsapp", "outbound", whatsappText, "balance_link");
    await recordIntegrationLog({
      bookingId,
      provider: "whatsapp",
      action: "whatsapp.send_balance_link",
      status: "success",
      payload: { phone: booking.client.phone },
    });
  } catch (err) {
    console.error(err);
    await recordIntegrationLog({
      bookingId,
      provider: "whatsapp",
      action: "whatsapp.send_balance_link",
      status: "failure",
      error: err,
      payload: { phone: booking.client.phone },
    });
  }
  try {
    await sendEmail({
      to: booking.client.email,
      subject: emailTpl.subject,
      html: emailTpl.html,
      text: emailTpl.text,
    });
    await sendMessage(booking.id, "email", "outbound", emailTpl.text, "balance_link");
    await recordIntegrationLog({
      bookingId,
      provider: "email",
      action: "email.send_balance_link",
      status: "success",
      payload: { to: booking.client.email },
    });
  } catch (err) {
    console.error(err);
    await recordIntegrationLog({
      bookingId,
      provider: "email",
      action: "email.send_balance_link",
      status: "failure",
      error: err,
      payload: { to: booking.client.email },
    });
  }

  await logAudit(bookingId, actorId ?? null, "balance.link_created", null, {
    paymentId,
    amount,
  });

  return { ok: true, paymentId, linkUrl: link.short_url };
}

// ---------- Stage 9: Healed-Photo Request & Feedback ----------

export async function sendHealedPhotoFollowUp(bookingId: string, actorId?: string) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { client: true },
  });
  if (!booking) return { ok: false, error: "Booking not found" };

  const targetStage = "closed_followup";
  const currentNormalized = normalizeToV1Stage(booking.stage);
  const targetNormalized = normalizeToV1Stage(targetStage);
  if (currentNormalized !== targetNormalized && !canTransitionV1(booking.stage, targetStage)) {
    return {
      ok: false,
      error: `Invalid state transition from '${booking.stage}' (${currentNormalized}) to '${targetStage}'`,
    };
  }

  const feedbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/feedback/${bookingId}`;
  const whatsappText = `Hi ${booking.client.name}, we hope your session has healed well! Please share your healed photos and rate your experience: ${feedbackUrl}`;

  try {
    await sendWhatsAppText(booking.client.phone, whatsappText);
    await sendMessage(booking.id, "whatsapp", "outbound", whatsappText, "healed_photo_request");
    await recordIntegrationLog({
      bookingId,
      provider: "whatsapp",
      action: "whatsapp.send_healed_photo_followup",
      status: "success",
      payload: { phone: booking.client.phone },
    });
  } catch (err) {
    console.error(err);
    await recordIntegrationLog({
      bookingId,
      provider: "whatsapp",
      action: "whatsapp.send_healed_photo_followup",
      status: "failure",
      error: err,
      payload: { phone: booking.client.phone },
    });
  }

  await db
    .update(bookings)
    .set({ stage: "follow_up_sent", followUpSentAt: new Date() })
    .where(eq(bookings.id, bookingId));

  await logAudit(bookingId, actorId ?? null, "follow_up.sent", null, { feedbackUrl });
  return { ok: true };
}

export async function submitFeedback(
  bookingId: string,
  rating: number,
  feedback?: string,
  healedPhotoUrl?: string
) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { client: true },
  });
  if (!booking) return { ok: false, error: "Booking not found" };

  await db
    .update(bookings)
    .set({
      stage: "follow_up_completed",
      followUpCompletedAt: new Date(),
      followUpRating: rating,
      followUpFeedback: feedback ?? null,
    })
    .where(eq(bookings.id, bookingId));

  const threshold = Number(process.env.FEEDBACK_THRESHOLD ?? 4);
  if (rating < threshold && booking.hubspotDealId) {
    try {
      await addNote(
        booking.hubspotDealId,
        `Low rating alert (${rating}/5). Client Feedback: ${feedback ?? "None provided"}`
      );
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.add_low_rating_note",
        status: "success",
        payload: { rating },
      });
    } catch (err) {
      console.error(err);
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.add_low_rating_note",
        status: "failure",
        error: err,
        payload: { rating },
      });
    }
  }

  if (healedPhotoUrl && booking.hubspotDealId) {
    try {
      await addNote(
        booking.hubspotDealId,
        `Healed photo submitted by client: ${healedPhotoUrl}`
      );
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.add_healed_photo_note",
        status: "success",
        payload: { healedPhotoUrl },
      });
    } catch (err) {
      console.error(err);
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "deal.add_healed_photo_note",
        status: "failure",
        error: err,
        payload: { healedPhotoUrl },
      });
    }
  }

  await logAudit(bookingId, null, "feedback.submitted", null, {
    rating,
    feedback,
    healedPhotoUrl,
  });
  return { ok: true, lowRating: rating < threshold };
}

// ---------- Queries ----------

export async function listBookings(
  filters?: { stage?: string; artistId?: string }
): Promise<BookingWithClient[]> {
  const conditions = [];
  if (filters?.stage) conditions.push(eq(bookings.stage, filters.stage as never));
  if (filters?.artistId) conditions.push(eq(bookings.artistId, filters.artistId));
  return db.query.bookings.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: { client: true },
    orderBy: [desc(bookings.createdAt)],
  });
}

export async function getBooking(id: string): Promise<BookingWithClient | null> {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, id),
    with: { client: true },
  });
  return booking ?? null;
}

export async function listMessages(bookingId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.bookingId, bookingId))
    .orderBy(asc(messages.createdAt));
}

export async function listPayments(bookingId: string) {
  return db.select().from(payments).where(eq(payments.bookingId, bookingId));
}

export async function getConsentForm(bookingId: string) {
  return db.query.consentRecords.findFirst({
    where: eq(consentRecords.bookingId, bookingId),
  });
}

export async function logInboundMessage(
  bookingId: string,
  content: string,
  from: string
) {
  await db.insert(messages).values({
    id: randomUUID(),
    bookingId,
    channel: "whatsapp",
    direction: "inbound",
    content,
  });
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { client: true },
  });
  if (booking?.hubspotDealId) {
    try {
      await logMessage(booking.client.hubspotContactId ?? "", content, "inbound");
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "message.log_inbound",
        status: "success",
      });
    } catch (err) {
      console.error(err);
      await recordIntegrationLog({
        bookingId,
        provider: "hubspot",
        action: "message.log_inbound",
        status: "failure",
        error: err,
      });
    }
  }
  await logAudit(bookingId, null, "whatsapp.inbound", null, { from, content });
}
