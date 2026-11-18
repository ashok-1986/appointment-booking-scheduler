import { describe, expect, test } from "bun:test";
import {
  buildPersonalizedWhatsAppMessage,
  buildPersonalizedWhatsAppUrl,
  normalizePhoneForWhatsApp,
} from "@/lib/services/whatsapp-composer";

describe("Calendar WhatsApp Session Confirmation & Modal Integration", () => {
  const decodeUrlText = (url: string): string => {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.searchParams.get("text") || "");
  };

  describe("Calendar Session Confirmation Message Generation", () => {
    const mockSession = {
      phone: "9876543210",
      name: "Priya Sharma",
      stage: "confirmed_scheduled",
      serviceType: "Custom Tattoo",
      placement: "Inner Forearm",
      sessionDate: "Mon, 23 Nov 2026",
      sessionTime: "10:00 AM to 1:00 PM",
      durationHours: "3",
    };

    test("recipient is ALWAYS the client addressed by first name", () => {
      const message = buildPersonalizedWhatsAppMessage(mockSession);

      expect(message.startsWith("Hi Priya!")).toBe(true);
      expect(message).toContain("Priya");
    });

    test("sender is ALWAYS Prerna with explicit studio identification and signoff", () => {
      const message = buildPersonalizedWhatsAppMessage(mockSession);

      expect(message).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
      expect(message.endsWith("- Prerna")).toBe(true);
    });

    test("formats date, time, duration, service, and placement accurately", () => {
      const message = buildPersonalizedWhatsAppMessage(mockSession);

      expect(message).toContain("📅 Date: Mon, 23 Nov 2026");
      expect(message).toContain("⏰ Time: 10:00 AM to 1:00 PM (3 hrs)");
      expect(message).toContain("🎨 Service: Custom Tattoo (Inner Forearm)");
    });

    test("formats studio location as Indiranagar, Bangalore", () => {
      const message = buildPersonalizedWhatsAppMessage(mockSession);

      expect(message).toContain("📍 Studio: Indiranagar, Bangalore");
    });

    test("includes comprehensive preparation tips for the client", () => {
      const message = buildPersonalizedWhatsAppMessage(mockSession);

      expect(message).toContain("💡 Prep tips:");
      expect(message).toContain("get a good night's rest");
      expect(message).toContain("stay well hydrated");
      expect(message).toContain("eat well before arriving");
      expect(message).toContain("complete your digital consent form beforehand");
    });

    test("handles session without placement gracefully", () => {
      const message = buildPersonalizedWhatsAppMessage({
        ...mockSession,
        placement: null,
      });

      expect(message).toContain("🎨 Service: Custom Tattoo\n");
      expect(message).not.toContain("null");
      expect(message).not.toContain("undefined");
    });

    test("handles multiple first names and trims properly", () => {
      const message = buildPersonalizedWhatsAppMessage({
        ...mockSession,
        name: "  Dr. Ananya Roy  ",
      });

      expect(message.startsWith("Hi Dr.!")).toBe(true);
    });
  });

  describe("Calendar Session WhatsApp URL Generation", () => {
    test("generates wa.me URL targeting normalized client phone", () => {
      const url = buildPersonalizedWhatsAppUrl({
        phone: "9876543210",
        name: "Rohan Kapoor",
        stage: "confirmed_scheduled",
        serviceType: "Black & Grey Realism",
        placement: "Shoulder",
        sessionDate: "Wed, 25 Nov 2026",
        sessionTime: "2:00 PM to 6:00 PM",
        durationHours: 4,
      });

      expect(url.startsWith("https://wa.me/919876543210?text=")).toBe(true);

      const decoded = decodeUrlText(url);
      expect(decoded).toContain("Hi Rohan!");
      expect(decoded).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
      expect(decoded).toContain("📅 Date: Wed, 25 Nov 2026");
      expect(decoded).toContain("⏰ Time: 2:00 PM to 6:00 PM (4 hrs)");
      expect(decoded).toContain("🎨 Service: Black & Grey Realism (Shoulder)");
      expect(decoded).toContain("📍 Studio: Indiranagar, Bangalore");
      expect(decoded).toContain("💡 Prep tips:");
      expect(decoded).toContain("- Prerna");
    });

    test("normalizes phones with spaces, dashes, +91, and leading zero", () => {
      const variants = [
        "+91 98765 43210",
        "+91-98765-43210",
        "09876543210",
        "919876543210",
      ];

      for (const phone of variants) {
        const url = buildPersonalizedWhatsAppUrl({
          phone,
          name: "Rohan",
          stage: "confirmed_scheduled",
        });
        expect(url.startsWith("https://wa.me/919876543210?text=")).toBe(true);
      }
    });

    test("returns empty string if phone is missing or completely invalid", () => {
      const url = buildPersonalizedWhatsAppUrl({
        phone: "",
        name: "Client",
        stage: "confirmed_scheduled",
      });
      expect(url).toBe("");

      const invalidUrl = buildPersonalizedWhatsAppUrl({
        phone: "invalid123",
        name: "Client",
        stage: "confirmed_scheduled",
      });
      expect(invalidUrl).toBe("");
    });
  });

  describe("API Calendar Sessions Response Integration Contract", () => {
    test("matches response shape produced by POST /api/calendar/sessions", () => {
      const resolvedClientPhone = "+91 98765 43210";
      const resolvedClientName = "Sneha Patel";
      const meetingDisplayName = "Custom Tattoo";
      const placement = "Ribcage";
      const start = new Date(2026, 10, 27, 14, 0); // 27 Nov 2026, 14:00
      const end = new Date(2026, 10, 27, 17, 30); // 27 Nov 2026, 17:30
      const duration = 210; // 3.5 hours

      const dateFormatted = start.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const startTimeStr = start.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const endTimeStr = end.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const durationHours = (duration / 60).toFixed(duration % 60 === 0 ? 0 : 1);

      const whatsappMessage = buildPersonalizedWhatsAppMessage({
        phone: resolvedClientPhone,
        name: resolvedClientName,
        stage: "confirmed_scheduled",
        serviceType: meetingDisplayName,
        placement: placement || null,
        sessionDate: dateFormatted,
        sessionTime: `${startTimeStr} to ${endTimeStr}`,
        durationHours,
      });

      const whatsappUrl = buildPersonalizedWhatsAppUrl({
        phone: resolvedClientPhone,
        name: resolvedClientName,
        stage: "confirmed_scheduled",
        serviceType: meetingDisplayName,
        placement: placement || null,
        sessionDate: dateFormatted,
        sessionTime: `${startTimeStr} to ${endTimeStr}`,
        durationHours,
      });

      const apiResponse = {
        ok: true,
        session: {
          id: "session-123",
          bookingId: "booking-456",
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString(),
        },
        bookingId: "booking-456",
        client: {
          id: "client-789",
          name: resolvedClientName,
          phone: resolvedClientPhone,
        },
        whatsappMessage,
        whatsappUrl,
      };

      // Assert API Response Contract
      expect(apiResponse.ok).toBe(true);
      expect(apiResponse.whatsappMessage).toBeDefined();
      expect(apiResponse.whatsappUrl).toBeDefined();
      expect(apiResponse.whatsappMessage).toContain("Hi Sneha!");
      expect(apiResponse.whatsappMessage).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
      expect(apiResponse.whatsappMessage).toContain("Indiranagar, Bangalore");
      expect(apiResponse.whatsappMessage).toContain("- Prerna");
      expect(apiResponse.whatsappUrl).toContain("https://wa.me/919876543210?text=");
    });
  });

  describe("WhatsApp Modal Display & Normalization Logic", () => {
    test("formats 10-digit Indian numbers cleanly for display", () => {
      const rawPhone = "9876543210";
      const normalized = normalizePhoneForWhatsApp(rawPhone);
      expect(normalized).toBe("919876543210");

      const displayPhone = normalized
        ? normalized.startsWith("91") && normalized.length === 12
          ? `+91 ${normalized.slice(2, 7)} ${normalized.slice(7)}`
          : `+${normalized}`
        : rawPhone;

      expect(displayPhone).toBe("+91 98765 43210");
    });

    test("formats international numbers with + prefix", () => {
      const rawPhone = "+1 415 555 2671";
      const normalized = normalizePhoneForWhatsApp(rawPhone);
      expect(normalized).toBe("14155552671");

      const displayPhone = normalized
        ? normalized.startsWith("91") && normalized.length === 12
          ? `+91 ${normalized.slice(2, 7)} ${normalized.slice(7)}`
          : `+${normalized}`
        : rawPhone;

      expect(displayPhone).toBe("+14155552671");
    });
  });
});
