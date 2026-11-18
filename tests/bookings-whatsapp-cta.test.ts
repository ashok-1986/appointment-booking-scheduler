import { describe, expect, test } from "bun:test";
import {
  buildPersonalizedWhatsAppUrl,
  buildPersonalizedWhatsAppMessage,
  normalizePhoneForWhatsApp,
  WHATSAPP_STAGE_TEMPLATES,
  applyWhatsAppTemplate,
} from "@/lib/services/whatsapp-composer";

describe("Bookings Dashboard WhatsApp CTA Personalization", () => {
  const mockBooking = {
    phone: "9876543210",
    name: "Rohit Verma",
    serviceType: "Custom Tattoo",
    placement: "Forearm",
  };

  const decodeUrlMessage = (url: string): string => {
    const urlObj = new URL(url);
    return decodeURIComponent(urlObj.searchParams.get("text") || "");
  };

  describe("WhatsApp URL Generation for All Key Pipeline Stages", () => {
    test("stage 'new_enquiry' produces personalized URL with phone, client name, Prerna sender intro, and enquiry context", () => {
      const url = buildPersonalizedWhatsAppUrl({
        ...mockBooking,
        stage: "new_enquiry",
      });

      expect(url).toContain("https://wa.me/919876543210?text=");
      const text = decodeUrlMessage(url);
      expect(text).toContain("Hi Rohit!");
      expect(text).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
      expect(text).toContain("- Prerna");
      expect(text).toContain("Thank you for your enquiry regarding your custom tattoo idea on your Forearm!");
      expect(text).toContain("When would be a good time for a quick chat?");
    });

    test("stage 'deposit_pending' produces personalized URL with deposit & quote instructions", () => {
      const url = buildPersonalizedWhatsAppUrl({
        ...mockBooking,
        stage: "deposit_pending",
      });

      expect(url).toContain("https://wa.me/919876543210?text=");
      const text = decodeUrlMessage(url);
      expect(text).toContain("Hi Rohit!");
      expect(text).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
      expect(text).toContain("- Prerna");
      expect(text).toContain("Your custom quote and session plan for your Forearm tattoo are ready!");
      expect(text).toContain("lock in your appointment date on my calendar, please review and confirm with the deposit link");
    });

    test("stage 'confirmed_scheduled' produces personalized URL with session details and prep tips", () => {
      const url = buildPersonalizedWhatsAppUrl({
        ...mockBooking,
        stage: "confirmed_scheduled",
        sessionDate: "Nov 25, 2026",
        sessionTime: "2:00 PM",
        durationHours: 3,
      });

      expect(url).toContain("https://wa.me/919876543210?text=");
      const text = decodeUrlMessage(url);
      expect(text).toContain("Hi Rohit!");
      expect(text).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
      expect(text).toContain("- Prerna");
      expect(text).toContain("Your custom tattoo session is confirmed on the studio calendar! ✨");
      expect(text).toContain("📅 Date: Nov 25, 2026");
      expect(text).toContain("⏰ Time: 2:00 PM (3 hrs)");
      expect(text).toContain("🎨 Service: Custom Tattoo (Forearm)");
      expect(text).toContain("📍 Studio: Indiranagar, Bangalore");
      expect(text).toContain("Prep tips: Please get a good night's rest, stay well hydrated, eat well before arriving");
      expect(text).toContain("complete your digital consent form beforehand");
    });

    test("stage 'session_completed' produces personalized URL with aftercare guidance", () => {
      const url = buildPersonalizedWhatsAppUrl({
        ...mockBooking,
        stage: "session_completed",
      });

      expect(url).toContain("https://wa.me/919876543210?text=");
      const text = decodeUrlMessage(url);
      expect(text).toContain("Hi Rohit!");
      expect(text).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
      expect(text).toContain("- Prerna");
      expect(text).toContain("Thank you so much for sitting today on your Forearm!");
      expect(text).toContain("It was an absolute pleasure bringing your tattoo to life.");
      expect(text).toContain("Please remember to follow your aftercare instructions closely");
    });

    test("stage 'payment_pending' produces personalized URL with balance payment reminder", () => {
      const url = buildPersonalizedWhatsAppUrl({
        ...mockBooking,
        stage: "payment_pending",
      });

      expect(url).toContain("https://wa.me/919876543210?text=");
      const text = decodeUrlMessage(url);
      expect(text).toContain("Hi Rohit!");
      expect(text).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
      expect(text).toContain("- Prerna");
      expect(text).toContain("Thank you so much for sitting today for your Forearm session!");
      expect(text).toContain("friendly reminder regarding settling the balance payment for your booking");
    });

    test("stage 'closed_followup' produces personalized URL requesting healed photos and feedback", () => {
      const url = buildPersonalizedWhatsAppUrl({
        ...mockBooking,
        stage: "closed_followup",
      });

      expect(url).toContain("https://wa.me/919876543210?text=");
      const text = decodeUrlMessage(url);
      expect(text).toContain("Hi Rohit!");
      expect(text).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
      expect(text).toContain("- Prerna");
      expect(text).toContain("Checking in to see how your tattoo on your Forearm is healing up!");
      expect(text).toContain("Please share some healed photos when you get a chance, along with any feedback!");
    });
  });

  describe("Legacy Stage Mapping in Bookings List & Dossier", () => {
    test("maps legacy 'enquiry' stage to new_enquiry message template", () => {
      const url = buildPersonalizedWhatsAppUrl({
        ...mockBooking,
        stage: "enquiry",
      });
      const text = decodeUrlMessage(url);
      expect(text).toContain("Thank you for your enquiry regarding your custom tattoo idea");
    });

    test("maps legacy 'deposit_requested' stage to deposit_pending message template", () => {
      const url = buildPersonalizedWhatsAppUrl({
        ...mockBooking,
        stage: "deposit_requested",
      });
      const text = decodeUrlMessage(url);
      expect(text).toContain("Your custom quote and session plan for your Forearm tattoo are ready!");
    });

    test("maps legacy 'scheduled' stage to confirmed_scheduled message template", () => {
      const url = buildPersonalizedWhatsAppUrl({
        ...mockBooking,
        stage: "scheduled",
      });
      const text = decodeUrlMessage(url);
      expect(text).toContain("Your custom tattoo session is confirmed on the studio calendar! ✨");
    });

    test("maps legacy 'session_complete' stage to session_completed message template", () => {
      const url = buildPersonalizedWhatsAppUrl({
        ...mockBooking,
        stage: "session_complete",
      });
      const text = decodeUrlMessage(url);
      expect(text).toContain("Thank you so much for sitting today on your Forearm!");
    });

    test("maps legacy 'paid_in_full' stage to payment_pending message template", () => {
      const url = buildPersonalizedWhatsAppUrl({
        ...mockBooking,
        stage: "paid_in_full",
      });
      const text = decodeUrlMessage(url);
      expect(text).toContain("friendly reminder regarding settling the balance payment for your booking");
    });

    test("maps legacy 'follow_up_completed' stage to closed_followup message template", () => {
      const url = buildPersonalizedWhatsAppUrl({
        ...mockBooking,
        stage: "follow_up_completed",
      });
      const text = decodeUrlMessage(url);
      expect(text).toContain("Checking in to see how your tattoo on your Forearm is healing up!");
    });
  });

  describe("Custom Notes Appending in Dossier Quick Dispatch", () => {
    test("appends artist's custom note cleanly before signoff", () => {
      const url = buildPersonalizedWhatsAppUrl({
        ...mockBooking,
        stage: "confirmed_scheduled",
        customNote: "Please remember to wear a loose-fitting short sleeve shirt!",
      });

      const text = decodeUrlMessage(url);
      expect(text).toContain("Hi Rohit!");
      expect(text).toContain("Please remember to wear a loose-fitting short sleeve shirt!");
      expect(text).toContain("- Prerna");
      expect(text.indexOf("Please remember to wear a loose-fitting short sleeve shirt!")).toBeLessThan(
        text.indexOf("- Prerna")
      );
    });
  });

  describe("Stage Template Chips in Quick WhatsApp Dispatch", () => {
    test("WHATSAPP_STAGE_TEMPLATES covers all 7 canonical stages and populates client name", () => {
      for (const tmpl of WHATSAPP_STAGE_TEMPLATES) {
        const rendered = applyWhatsAppTemplate(tmpl.text, "Ananya Rao");
        expect(rendered).toContain("Hi Ananya!");
        expect(rendered).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
        expect(rendered).toContain("- Prerna");
      }
    });
  });
});
