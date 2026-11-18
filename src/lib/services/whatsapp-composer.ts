import { normalizeToV1Stage, type V1BookingStage } from "@/lib/state-machine";

/**
 * Normalizes a phone number for WhatsApp deep-links.
 * - Strips all non-digit characters.
 * - Prepends "91" (India country code) for 10-digit mobile numbers.
 * - Handles 11-digit numbers starting with 0 by converting to 91.
 * - Retains valid international numbers (11 to 15 digits).
 * - Returns an empty string for invalid or empty inputs.
 */
export function normalizePhoneForWhatsApp(phone: string | null | undefined): string {
  if (!phone || typeof phone !== "string") {
    return "";
  }

  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  // Standard Indian 10-digit mobile number without country code
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // 11-digit Indian number starting with trunk prefix '0' (e.g., 09876543210)
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }

  // 12-digit Indian number starting with 91
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  // Other valid international phone numbers (11 to 15 digits)
  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }

  // Too short (<10) or too long (>15)
  return "";
}

export interface PersonalizedWhatsAppParams {
  phone: string;
  name: string;
  stage?: string | null;
  serviceType?: string | null;
  placement?: string | null;
  sessionDate?: string | null;
  sessionTime?: string | null;
  durationHours?: string | number | null;
  isRepeat?: boolean;
  customNote?: string | null;
}

/**
 * Builds a personalized WhatsApp message where:
 * - Client is ALWAYS the receiver (e.g. "Hi Rahul!")
 * - Sender is ALWAYS Prerna ("It's Prerna from Meet Prerna Tattoo Studio." / signed "- Prerna")
 * - Content is customized according to the tattoo lifecycle stage or customer relationship.
 */
export function buildPersonalizedWhatsAppMessage(
  params: PersonalizedWhatsAppParams
): string {
  const trimmedName = params.name?.trim() || "";
  const firstName = trimmedName ? trimmedName.split(/\s+/)[0] : "there";
  const greeting = `Hi ${firstName}!`;
  const senderIntro = "It's Prerna from Meet Prerna Tattoo Studio.";
  const signoff = "- Prerna";

  const normalizedStage: V1BookingStage | null =
    params.stage && params.stage !== "repeat"
      ? normalizeToV1Stage(params.stage)
      : null;

  let body = "";

  if (normalizedStage) {
    switch (normalizedStage) {
      case "new_enquiry": {
        const service = params.serviceType ? params.serviceType.toLowerCase() : "tattoo";
        const placementPart = params.placement ? ` on your ${params.placement}` : "";
        body =
          `Thank you for your enquiry regarding your ${service} idea${placementPart}! ` +
          `I've reviewed your request and would love to discuss the design concept and sizing with you. ` +
          `When would be a good time for a quick chat?`;
        break;
      }

      case "consultation_review": {
        const placementPart = params.placement ? ` for your ${params.placement}` : "";
        body =
          `I've been reviewing your design references and tattoo concept${placementPart}! ` +
          `I'd love to connect to lock down your sizing, composition, and placement consultation. ` +
          `Let me know when you're available for a chat!`;
        break;
      }

      case "deposit_pending": {
        const placementPart = params.placement ? ` for your ${params.placement} tattoo` : "";
        body =
          `Your custom quote and session plan${placementPart} are ready! ` +
          `To lock in your appointment date on my calendar, please review and confirm with the deposit link sent to your email or messages. ` +
          `Let me know if you have any questions before booking!`;
        break;
      }

      case "confirmed_scheduled": {
        const service = params.serviceType || "Tattoo";
        const placementPart = params.placement ? ` (${params.placement})` : "";
        const dateLine = params.sessionDate ? `\n📅 Date: ${params.sessionDate}` : "";
        const durationText = params.durationHours ? ` (${params.durationHours} hrs)` : "";
        const timeLine = params.sessionTime ? `\n⏰ Time: ${params.sessionTime}${durationText}` : "";

        const details =
          dateLine || timeLine
            ? `${dateLine}${timeLine}\n🎨 Service: ${service}${placementPart}\n📍 Studio: Indiranagar, Bangalore`
            : `\n🎨 Service: ${service}${placementPart}\n📍 Studio: Indiranagar, Bangalore`;

        body =
          `Your ${service.toLowerCase()} session is confirmed on the studio calendar! ✨` +
          details +
          `\n\n💡 Prep tips: Please get a good night's rest, stay well hydrated, eat well before arriving, and make sure to complete your digital consent form beforehand. Looking forward to our session!`;
        break;
      }

      case "session_completed": {
        const placementPart = params.placement ? ` on your ${params.placement}` : "";
        body =
          `Thank you so much for sitting today${placementPart}! It was an absolute pleasure bringing your tattoo to life. ` +
          `Please remember to follow your aftercare instructions closely to ensure optimal healing. ` +
          `Feel free to reach out if you have any questions during the healing process!`;
        break;
      }

      case "payment_pending": {
        const placementPart = params.placement ? ` for your ${params.placement} session` : "";
        body =
          `Thank you so much for sitting today${placementPart}! ` +
          `This is a friendly reminder regarding settling the balance payment for your booking. ` +
          `Please let me know once completed so I can update your studio records.`;
        break;
      }

      case "closed_followup": {
        const placementPart = params.placement ? ` on your ${params.placement}` : "";
        body =
          `Checking in to see how your tattoo${placementPart} is healing up! ` +
          `I'd love to see how the healed piece looks once it's fully settled. ` +
          `Please share some healed photos when you get a chance, along with any feedback!`;
        break;
      }

      case "not_a_fit": {
        body =
          `Thank you for considering Meet Prerna for your tattoo project. ` +
          `While this particular concept isn't the right fit for my artistic style and focus, ` +
          `I truly appreciate you reaching out and wish you the absolute best with your tattoo journey!`;
        break;
      }

      case "cancelled": {
        const placementPart = params.placement ? ` for your ${params.placement} tattoo` : "";
        body =
          `I wanted to follow up regarding your cancelled appointment${placementPart}. ` +
          `If you would like to reschedule in the future or explore a new concept, ` +
          `feel free to reach out whenever you're ready!`;
        break;
      }
    }
  } else if (params.isRepeat) {
    const placementPart = params.placement ? ` on your ${params.placement}` : "";
    body =
      `Welcome back to Meet Prerna Tattoo Studio! It's always wonderful working with you again. ` +
      `I'm excited to hear about your next tattoo project${placementPart}. ` +
      `Tell me what new idea or piece you have in mind!`;
  } else {
    const placementPart = params.placement ? ` on your ${params.placement}` : "";
    body =
      `Thank you for connecting regarding your tattoo project${placementPart}! ` +
      `I'd love to discuss your design idea and answer any questions you might have about booking a session with me.`;
  }

  const customNoteStr = params.customNote?.trim() ? `\n\n${params.customNote.trim()}` : "";

  return `${greeting}\n\n${senderIntro}\n\n${body}${customNoteStr}\n\n${signoff}`;
}

/**
 * Builds a direct `https://wa.me/...` URL with the personalized message pre-filled.
 * Returns an empty string if the phone number is invalid.
 */
export function buildPersonalizedWhatsAppUrl(
  params: PersonalizedWhatsAppParams
): string {
  const cleanPhone = normalizePhoneForWhatsApp(params.phone);
  if (!cleanPhone) {
    return "";
  }

  const message = buildPersonalizedWhatsAppMessage(params);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export interface WhatsAppStageTemplate {
  label: string;
  stage: V1BookingStage;
  text: string;
}

/**
 * Stage-aware templates for inline UI composers (e.g. quick-whatsapp-composer.tsx)
 * Client is receiver ({{name}} placeholder), sender is Prerna.
 */
export const WHATSAPP_STAGE_TEMPLATES: WhatsAppStageTemplate[] = [
  {
    label: "New Enquiry Welcome",
    stage: "new_enquiry",
    text: "Hi {{name}}! It's Prerna from Meet Prerna Tattoo Studio. Thank you for your tattoo enquiry! I've reviewed your request and would love to discuss your design idea and placement. When would be a good time for a quick chat?\n\n- Prerna",
  },
  {
    label: "Consultation & Sizing",
    stage: "consultation_review",
    text: "Hi {{name}}! It's Prerna from Meet Prerna Tattoo Studio. I've reviewed your design references and brief! I'd love to connect to lock down your sizing, composition, and placement consultation. Let me know when you're free to chat!\n\n- Prerna",
  },
  {
    label: "Deposit & Quote Ready",
    stage: "deposit_pending",
    text: "Hi {{name}}! It's Prerna from Meet Prerna Tattoo Studio. Your custom tattoo quote is prepared! Please confirm your booking with the deposit link to lock in your appointment date on my studio calendar.\n\n- Prerna",
  },
  {
    label: "Session Reminder & Prep",
    stage: "confirmed_scheduled",
    text: "Hi {{name}}! It's Prerna from Meet Prerna Tattoo Studio. Friendly reminder of our upcoming tattoo session at our Indiranagar, Bangalore studio! Please stay well hydrated, eat well before coming, and make sure your digital consent form is completed beforehand. Looking forward to our session!\n\n- Prerna",
  },
  {
    label: "Session Follow-up & Aftercare",
    stage: "session_completed",
    text: "Hi {{name}}! It's Prerna from Meet Prerna Tattoo Studio. Thank you so much for sitting today! Your tattoo turned out amazing. Please follow your aftercare instructions closely to ensure beautiful healing, and feel free to reach out if you have any questions!\n\n- Prerna",
  },
  {
    label: "Balance Payment Reminder",
    stage: "payment_pending",
    text: "Hi {{name}}! It's Prerna from Meet Prerna Tattoo Studio. Thank you so much for sitting for your session today! This is a friendly reminder regarding settling the balance payment for your booking. Please let me know once completed so I can update your studio records.\n\n- Prerna",
  },
  {
    label: "Healed Photos & Check-in",
    stage: "closed_followup",
    text: "Hi {{name}}! It's Prerna from Meet Prerna Tattoo Studio. Checking in to see how your tattoo is healing up! I'd love to see how the healed piece looks once it's fully settled. Please share some healed photos when you get a chance!\n\n- Prerna",
  },
];

/**
 * Replaces {{name}} template token with the client's first name.
 */
export function applyWhatsAppTemplate(
  templateText: string,
  clientName: string
): string {
  const trimmed = clientName?.trim() || "";
  const firstName = trimmed ? trimmed.split(/\s+/)[0] : "there";
  return templateText.replace(/\{\{name\}\}/g, firstName);
}
