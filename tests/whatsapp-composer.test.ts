import { describe, expect, test } from "bun:test";
import {
  normalizePhoneForWhatsApp,
  buildPersonalizedWhatsAppMessage,
  buildPersonalizedWhatsAppUrl,
  WHATSAPP_STAGE_TEMPLATES,
  applyWhatsAppTemplate,
  type PersonalizedWhatsAppParams,
} from "@/lib/services/whatsapp-composer";
import { V1_PIPELINE_STAGES } from "@/lib/state-machine";

describe("WhatsApp Composer Service", () => {
  describe("normalizePhoneForWhatsApp", () => {
    test("normalizes standard 10-digit Indian mobile number by prepending 91", () => {
      expect(normalizePhoneForWhatsApp("9876543210")).toBe("919876543210");
    });

    test("leaves 12-digit Indian number with 91 prefix intact", () => {
      expect(normalizePhoneForWhatsApp("919876543210")).toBe("919876543210");
    });

    test("handles numbers formatted with spaces, dashes, and plus signs", () => {
      expect(normalizePhoneForWhatsApp("+91 98765 43210")).toBe("919876543210");
      expect(normalizePhoneForWhatsApp("+91-98765-43210")).toBe("919876543210");
      expect(normalizePhoneForWhatsApp("98765 43210")).toBe("919876543210");
      expect(normalizePhoneForWhatsApp("  +91 98765-43210  ")).toBe("919876543210");
    });

    test("normalizes 11-digit numbers starting with trunk 0 to 91", () => {
      expect(normalizePhoneForWhatsApp("09876543210")).toBe("919876543210");
    });

    test("preserves valid international numbers (11 to 15 digits)", () => {
      expect(normalizePhoneForWhatsApp("+1 415 555 2671")).toBe("14155552671");
      expect(normalizePhoneForWhatsApp("+44 7911 123456")).toBe("447911123456");
    });

    test("returns empty string for empty, undefined, null, or invalid inputs", () => {
      expect(normalizePhoneForWhatsApp("")).toBe("");
      expect(normalizePhoneForWhatsApp("   ")).toBe("");
      expect(normalizePhoneForWhatsApp(null as any)).toBe("");
      expect(normalizePhoneForWhatsApp(undefined as any)).toBe("");
      expect(normalizePhoneForWhatsApp("abc")).toBe("");
      expect(normalizePhoneForWhatsApp("12345")).toBe(""); // too short
      expect(normalizePhoneForWhatsApp("1234567890123456789")).toBe(""); // too long
    });
  });

  describe("buildPersonalizedWhatsAppMessage", () => {
    const baseParams: PersonalizedWhatsAppParams = {
      phone: "9876543210",
      name: "Aarav Sharma",
      serviceType: "Custom Tattoo",
      placement: "Forearm",
    };

    test("ensures client is receiver and sender is always Prerna across all 7 canonical stages", () => {
      for (const stage of V1_PIPELINE_STAGES) {
        const msg = buildPersonalizedWhatsAppMessage({
          ...baseParams,
          stage,
        });

        // Receiver check: Addressed to client
        expect(msg).toContain("Hi Aarav!");

        // Sender identity check: Prerna
        expect(msg).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
        expect(msg).toContain("- Prerna");

        // Client name is mentioned
        expect(msg).toContain("Aarav");
      }
    });

    test("generates stage-appropriate message for new_enquiry", () => {
      const msg = buildPersonalizedWhatsAppMessage({
        ...baseParams,
        stage: "new_enquiry",
        placement: "Inner Forearm",
      });

      expect(msg).toContain("Hi Aarav!");
      expect(msg).toContain("enquiry regarding your custom tattoo idea on your Inner Forearm");
      expect(msg).toContain("design concept and sizing");
      expect(msg).toContain("- Prerna");
    });

    test("generates stage-appropriate message for consultation_review", () => {
      const msg = buildPersonalizedWhatsAppMessage({
        ...baseParams,
        stage: "consultation_review",
        placement: "Upper Arm",
      });

      expect(msg).toContain("design references and tattoo concept for your Upper Arm");
      expect(msg).toContain("sizing, composition, and placement consultation");
      expect(msg).toContain("- Prerna");
    });

    test("generates stage-appropriate message for deposit_pending", () => {
      const msg = buildPersonalizedWhatsAppMessage({
        ...baseParams,
        stage: "deposit_pending",
        placement: "Back Shoulder",
      });

      expect(msg).toContain("custom quote and session plan for your Back Shoulder tattoo are ready");
      expect(msg).toContain("deposit link");
      expect(msg).toContain("lock in your appointment date");
      expect(msg).toContain("- Prerna");
    });

    test("generates stage-appropriate message for confirmed_scheduled with appointment details & prep tips", () => {
      const msg = buildPersonalizedWhatsAppMessage({
        ...baseParams,
        stage: "confirmed_scheduled",
        serviceType: "Realism Tattoo",
        placement: "Outer Thigh",
        sessionDate: "Friday, 21 Nov 2026",
        sessionTime: "2:00 PM",
        durationHours: 3.5,
      });

      expect(msg).toContain("realism tattoo session is confirmed on the studio calendar! ✨");
      expect(msg).toContain("📅 Date: Friday, 21 Nov 2026");
      expect(msg).toContain("⏰ Time: 2:00 PM (3.5 hrs)");
      expect(msg).toContain("🎨 Service: Realism Tattoo (Outer Thigh)");
      expect(msg).toContain("📍 Studio: Indiranagar, Bangalore");
      expect(msg).toContain("hydrate");
      expect(msg).toContain("eat well");
      expect(msg).toContain("digital consent");
      expect(msg).toContain("- Prerna");
    });

    test("generates stage-appropriate message for session_completed with aftercare guidance", () => {
      const msg = buildPersonalizedWhatsAppMessage({
        ...baseParams,
        stage: "session_completed",
        placement: "Ribs",
      });

      expect(msg).toContain("Thank you so much for sitting today on your Ribs");
      expect(msg).toContain("aftercare instructions");
      expect(msg).toContain("optimal healing");
      expect(msg).toContain("- Prerna");
    });

    test("generates stage-appropriate message for payment_pending", () => {
      const msg = buildPersonalizedWhatsAppMessage({
        ...baseParams,
        stage: "payment_pending",
        placement: "Calf",
      });

      expect(msg).toContain("settling the balance payment for your booking");
      expect(msg).toContain("- Prerna");
    });

    test("generates stage-appropriate message for closed_followup requesting healed photos", () => {
      const msg = buildPersonalizedWhatsAppMessage({
        ...baseParams,
        stage: "closed_followup",
        placement: "Wrist",
      });

      expect(msg).toContain("Checking in to see how your tattoo on your Wrist is healing up");
      expect(msg).toContain("healed photos");
      expect(msg).toContain("feedback");
      expect(msg).toContain("- Prerna");
    });

    test("generates polite follow-up messages for cancelled and not_a_fit terminal stages", () => {
      const cancelledMsg = buildPersonalizedWhatsAppMessage({
        ...baseParams,
        stage: "cancelled",
      });
      expect(cancelledMsg).toContain("follow up regarding your cancelled appointment");
      expect(cancelledMsg).toContain("- Prerna");

      const notAFitMsg = buildPersonalizedWhatsAppMessage({
        ...baseParams,
        stage: "not_a_fit",
      });
      expect(notAFitMsg).toContain("While this particular concept isn't the right fit");
      expect(notAFitMsg).toContain("- Prerna");
    });

    test("generates warm repeat customer message when isRepeat is true without active stage", () => {
      const msg = buildPersonalizedWhatsAppMessage({
        phone: "9876543210",
        name: "Pooja Hegde",
        isRepeat: true,
      });

      expect(msg).toContain("Hi Pooja!");
      expect(msg).toContain("Welcome back to Meet Prerna Tattoo Studio!");
      expect(msg).toContain("next tattoo project");
      expect(msg).toContain("- Prerna");
    });

    test("generates default studio greeting when no stage and not repeat", () => {
      const msg = buildPersonalizedWhatsAppMessage({
        phone: "9876543210",
        name: "Rohan",
      });

      expect(msg).toContain("Hi Rohan!");
      expect(msg).toContain("Thank you for connecting regarding your tattoo project");
      expect(msg).toContain("- Prerna");
    });

    test("correctly normalizes legacy stages using state-machine mapping", () => {
      const legacyConsultation = buildPersonalizedWhatsAppMessage({
        ...baseParams,
        stage: "in_consultation",
      });
      expect(legacyConsultation).toContain("sizing, composition, and placement consultation");

      const legacyComplete = buildPersonalizedWhatsAppMessage({
        ...baseParams,
        stage: "session_complete",
      });
      expect(legacyComplete).toContain("aftercare instructions");

      const legacyPaid = buildPersonalizedWhatsAppMessage({
        ...baseParams,
        stage: "paid_in_full",
      });
      expect(legacyPaid).toContain("balance payment");
    });

    test("includes custom note when provided", () => {
      const msg = buildPersonalizedWhatsAppMessage({
        ...baseParams,
        stage: "new_enquiry",
        customNote: "Please bring reference sketches if you have any.",
      });

      expect(msg).toContain("Please bring reference sketches if you have any.");
      expect(msg).toContain("- Prerna");
    });
  });

  describe("buildPersonalizedWhatsAppUrl", () => {
    test("builds complete wa.me URL with clean receiver phone and encoded message", () => {
      const url = buildPersonalizedWhatsAppUrl({
        phone: "+91 98765 43210",
        name: "Vikram Malhotra",
        stage: "confirmed_scheduled",
        serviceType: "Cover-up Tattoo",
        placement: "Shoulder",
        sessionDate: "Tomorrow",
        sessionTime: "11:00 AM",
      });

      expect(url).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);

      const parsedUrl = new URL(url);
      expect(parsedUrl.pathname).toBe("/919876543210");
      const decodedText = parsedUrl.searchParams.get("text");
      expect(decodedText).toBeTruthy();
      expect(decodedText).toContain("Hi Vikram!");
      expect(decodedText).toContain("Cover-up Tattoo");
      expect(decodedText).toContain("Indiranagar, Bangalore");
      expect(decodedText).toContain("- Prerna");
    });

    test("returns empty string when phone number is invalid or empty", () => {
      expect(
        buildPersonalizedWhatsAppUrl({
          phone: "",
          name: "Vikram",
          stage: "new_enquiry",
        })
      ).toBe("");

      expect(
        buildPersonalizedWhatsAppUrl({
          phone: "12345",
          name: "Vikram",
          stage: "new_enquiry",
        })
      ).toBe("");
    });
  });

  describe("WHATSAPP_STAGE_TEMPLATES & applyWhatsAppTemplate", () => {
    test("contains templates for all 7 canonical pipeline stages", () => {
      const templateStages = WHATSAPP_STAGE_TEMPLATES.map((t) => t.stage);
      for (const stage of V1_PIPELINE_STAGES) {
        expect(templateStages).toContain(stage);
      }
    });

    test("identifies Prerna as sender in every template", () => {
      for (const t of WHATSAPP_STAGE_TEMPLATES) {
        expect(t.text).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
        expect(t.text).toContain("- Prerna");
        expect(t.text).toContain("{{name}}");
      }
    });

    test("applyWhatsAppTemplate correctly substitutes client first name", () => {
      const sample = WHATSAPP_STAGE_TEMPLATES[0];
      const applied = applyWhatsAppTemplate(sample.text, "Neha Roy");

      expect(applied).toContain("Hi Neha!");
      expect(applied).not.toContain("{{name}}");
      expect(applied).toContain("- Prerna");
    });
  });
});
