import "dotenv/config";
import { escapeHtml } from "@/lib/utils";

const RESEND_URL = "https://api.resend.com/v1";

function getApiKey(): string {
  const key = process.env.RESEND_API_KEY!;
  if (!key) {
    throw new Error(
      "Resend credentials are not configured. Set RESEND_API_KEY."
    );
  }
  return key;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

export type SendEmailResponse = {
  id: string;
  from: string;
  to: string[];
  created_at: string;
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResponse> {
  const apiKey = getApiKey();
  const res = await fetch(`${RESEND_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: input.from || process.env.EMAIL_FROM || "booking@example.com",
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body as { error?: { message?: string } };
    throw new Error(
      `Resend error ${res.status}: ${err?.error?.message || res.statusText}`
    );
  }
  return body as SendEmailResponse;
}

export const EMAIL_TEMPLATES = {
  enquiryConfirmation: (name: string) => ({
    subject: "We received your enquiry",
    text: `Hi ${name},\n\nThanks for reaching out. We've received your enquiry and will get back to you within 1 business day.\n\nBest regards,\nThe Studio`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Thanks for reaching out. We've received your enquiry and will get back to you within <strong>1 business day</strong>.</p><p>Best regards,<br/>The Studio</p>`,
  }),
  depositLink: (
    name: string,
    amount: number,
    currency: string,
    linkUrl: string,
    expiresHours: number
  ) => {
    const formatted = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
    const safeName = escapeHtml(name);
    const safeFormatted = escapeHtml(formatted);
    const safeUrl = escapeHtml(linkUrl);
    return {
      subject: "Your deposit payment link",
      text: `Hi ${name},\n\nYour deposit of ${formatted} is due. Pay securely here: ${linkUrl}\nThis link expires in ${expiresHours} hours.`,
      html: `<p>Hi ${safeName},</p><p>Your deposit of <strong>${safeFormatted}</strong> is due. Pay securely here: <a href="${safeUrl}">${safeUrl}</a></p><p>This link expires in ${expiresHours} hours.</p>`,
    };
  },
  balanceLink: (
    name: string,
    amount: number,
    currency: string,
    linkUrl: string,
    expiresDays: number
  ) => {
    const formatted = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
    const safeName = escapeHtml(name);
    const safeFormatted = escapeHtml(formatted);
    const safeUrl = escapeHtml(linkUrl);
    return {
      subject: "Your balance payment link",
      text: `Hi ${name},\n\nYour remaining balance of ${formatted} is due. Pay securely here: ${linkUrl}\nThis link expires in ${expiresDays} days.`,
      html: `<p>Hi ${safeName},</p><p>Your remaining balance of <strong>${safeFormatted}</strong> is due. Pay securely here: <a href="${safeUrl}">${safeUrl}</a></p><p>This link expires in ${expiresDays} days.</p>`,
    };
  },
  paymentReceipt: (
    name: string,
    amount: number,
    currency: string,
    transactionId: string,
    kind: "deposit" | "balance"
  ) => {
    const formatted = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
    const safeName = escapeHtml(name);
    const safeFormatted = escapeHtml(formatted);
    const safeKind = escapeHtml(kind);
    const safeTx = escapeHtml(transactionId);
    return {
      subject: `Payment receipt: ${kind} paid`,
      text: `Hi ${name},\n\nWe received your ${kind} payment of ${formatted}.\nTransaction ID: ${transactionId}\n\nThank you!`,
      html: `<p>Hi ${safeName},</p><p>We received your ${safeKind} payment of <strong>${safeFormatted}</strong>.</p><p>Transaction ID: <code>${safeTx}</code></p><p>Thank you!</p>`,
    };
  },
  sessionConfirmation: (
    name: string,
    date: string,
    address: string,
    preparation: string
  ) => {
    const safeName = escapeHtml(name);
    const safeDate = escapeHtml(date);
    const safeAddress = escapeHtml(address);
    const safePrep = escapeHtml(preparation).replace(/\n/g, "<br/>");
    return {
      subject: "Your session is confirmed",
      text: `Hi ${name},\n\nYour session is confirmed for ${date}.\nStudio address: ${address}\n\nPreparation:\n${preparation}`,
      html: `<p>Hi ${safeName},</p><p>Your session is confirmed for <strong>${safeDate}</strong>.</p><p>Studio address: ${safeAddress}</p><p>Preparation:</p><p>${safePrep}</p>`,
    };
  },
  sessionReminder: (name: string, date: string, hours: number) => ({
    subject: `Session reminder: ${hours}h before`,
    text: `Hi ${name},\n\nReminder: your session is in ${hours} hours (${date}).`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Reminder: your session is in <strong>${hours} hours</strong> (${escapeHtml(date)}).</p>`,
  }),
  consentReminder: (name: string, link: string) => {
    const safeName = escapeHtml(name);
    const safeLink = escapeHtml(link);
    return {
      subject: "Please sign your consent form",
      text: `Hi ${name},\n\nPlease sign your consent form before your session: ${link}`,
      html: `<p>Hi ${safeName},</p><p>Please sign your consent form before your session: <a href="${safeLink}">${safeLink}</a></p>`,
    };
  },
  aftercare: (name: string) => ({
    subject: "Your aftercare instructions",
    text: `Hi ${name},\n\nThanks for your session today. Please follow the aftercare instructions attached.\n\nBest regards,\nThe Studio`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Thanks for your session today. Please follow the aftercare instructions attached.</p><p>Best regards,<br/>The Studio</p>`,
  }),
  decline: (name: string, reason?: string) => ({
    subject: "Update on your enquiry",
    text: `Hi ${name},\n\nThanks for your interest. After reviewing your enquiry, we're not able to take this on at the moment.${reason ? ` Reason: ${reason}` : ""}\n\nWe wish you the best.\nThe Studio`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Thanks for your interest. After reviewing your enquiry, we're not able to take this on at the moment.${reason ? ` Reason: ${escapeHtml(reason)}` : ""}</p><p>We wish you the best.<br/>The Studio</p>`,
  }),
  balanceReminder: (
    name: string,
    amount: number,
    currency: string,
    linkUrl: string
  ) => {
    const formatted = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
    const safeName = escapeHtml(name);
    const safeFormatted = escapeHtml(formatted);
    const safeUrl = escapeHtml(linkUrl);
    return {
      subject: "Reminder: balance payment due",
      text: `Hi ${name},\n\nYour balance of ${formatted} is still due. Pay here: ${linkUrl}`,
      html: `<p>Hi ${safeName},</p><p>Your balance of <strong>${safeFormatted}</strong> is still due. Pay here: <a href="${safeUrl}">${safeUrl}</a></p>`,
    };
  },
  healedPhotoRequest: (name: string, feedbackUrl: string) => {
    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(feedbackUrl);
    return {
      subject: "Share your healed photos + feedback",
      text: `Hi ${name},\n\nYour session should be healed by now. Please share your healed photos and let us know how it went: ${feedbackUrl}`,
      html: `<p>Hi ${safeName},</p><p>Your session should be healed by now. Please share your healed photos and let us know how it went: <a href="${safeUrl}">${safeUrl}</a></p>`,
    };
  },
};
