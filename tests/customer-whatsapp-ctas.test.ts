import { describe, expect, test } from "bun:test";
import {
  buildPersonalizedWhatsAppUrl,
  buildPersonalizedWhatsAppMessage,
  normalizePhoneForWhatsApp,
  WHATSAPP_STAGE_TEMPLATES,
  applyWhatsAppTemplate,
  type PersonalizedWhatsAppParams,
} from "@/lib/services/whatsapp-composer";
import { V1_PIPELINE_STAGES } from "@/lib/state-machine";

describe("Customer Dossier, Registry, & Workspace Composer WhatsApp Integration", () => {
  const decodeUrlMessage = (url: string): string => {
    if (!url) return "";
    const parsed = new URL(url);
    return decodeURIComponent(parsed.searchParams.get("text") || "");
  };

  describe("Customer Dossier WhatsApp Link Generation", () => {
    const mockCustomer = {
      phone: "+91 98765 43210",
      name: "Ananya Iyer",
    };

    test("selects active non-terminal booking and generates personalized URL", () => {
      const bookings = [
        {
          id: "book-1",
          stage: "closed_followup",
          serviceType: "Flash Tattoo",
          placement: "Wrist",
        },
        {
          id: "book-2",
          stage: "confirmed_scheduled",
          serviceType: "Custom Realism",
          placement: "Forearm",
        },
      ];

      const activeBooking =
        bookings.find(
          (b) =>
            b.stage !== "closed_followup" &&
            b.stage !== "not_a_fit" &&
            b.stage !== "cancelled"
        ) || bookings[0];

      expect(activeBooking.id).toBe("book-2");

      const waUrl = buildPersonalizedWhatsAppUrl({
        phone: mockCustomer.phone,
        name: mockCustomer.name,
        stage: activeBooking.stage,
        serviceType: activeBooking.serviceType,
        placement: activeBooking.placement,
        isRepeat: bookings.length > 1,
      });

      expect(waUrl).toContain("https://wa.me/919876543210?text=");
      const text = decodeUrlMessage(waUrl);
      expect(text).toContain("Hi Ananya!");
      expect(text).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
      expect(text).toContain("Custom Realism");
      expect(text).toContain("Forearm");
      expect(text).toContain("Indiranagar, Bangalore");
      expect(text).toContain("- Prerna");
    });

    test("falls back to bookings[0] when only terminal bookings exist", () => {
      const bookings = [
        {
          id: "book-old-1",
          stage: "closed_followup",
          serviceType: "Botanical Fine-line",
          placement: "Collarbone",
        },
        {
          id: "book-old-2",
          stage: "cancelled",
          serviceType: "Script",
          placement: "Ribs",
        },
      ];

      const activeBooking =
        bookings.find(
          (b) =>
            b.stage !== "closed_followup" &&
            b.stage !== "not_a_fit" &&
            b.stage !== "cancelled"
        ) || bookings[0];

      expect(activeBooking.id).toBe("book-old-1");

      const waUrl = buildPersonalizedWhatsAppUrl({
        phone: mockCustomer.phone,
        name: mockCustomer.name,
        stage: activeBooking.stage,
        serviceType: activeBooking.serviceType,
        placement: activeBooking.placement,
        isRepeat: bookings.length > 1,
      });

      const text = decodeUrlMessage(waUrl);
      expect(text).toContain("Hi Ananya!");
      expect(text).toContain("Checking in to see how your tattoo on your Collarbone is healing up!");
      expect(text).toContain("Please share some healed photos");
      expect(text).toContain("- Prerna");
    });

    test("handles client with multiple bookings marked as repeat collector", () => {
      const bookings = [
        { id: "b1", stage: "closed_followup" },
        { id: "b2", stage: "closed_followup" },
      ];

      // No active non-terminal booking, and bookings.length > 1
      const activeBooking = bookings.find(
        (b) =>
          b.stage !== "closed_followup" &&
          b.stage !== "not_a_fit" &&
          b.stage !== "cancelled"
      );

      const waUrl = buildPersonalizedWhatsAppUrl({
        phone: mockCustomer.phone,
        name: mockCustomer.name,
        stage: activeBooking?.stage || null,
        isRepeat: bookings.length > 1,
      });

      const text = decodeUrlMessage(waUrl);
      expect(text).toContain("Hi Ananya!");
      expect(text).toContain("Welcome back to Meet Prerna Tattoo Studio!");
      expect(text).toContain("It's always wonderful working with you again.");
      expect(text).toContain("- Prerna");
    });

    test("returns empty string when customer phone is invalid", () => {
      const waUrl = buildPersonalizedWhatsAppUrl({
        phone: "invalid",
        name: "Test",
        stage: "new_enquiry",
      });
      expect(waUrl).toBe("");
    });
  });

  describe("Customer Registry (Customers List) WhatsApp Link Generation", () => {
    test("generates personalized enquiry URL for first-time client in new_enquiry stage", () => {
      const customer = {
        phone: "9876543210",
        name: "Devendra Patel",
        latestBookingStage: "new_enquiry",
        isRepeat: false,
      };

      const waUrl = buildPersonalizedWhatsAppUrl({
        phone: customer.phone,
        name: customer.name,
        stage: customer.latestBookingStage || null,
        isRepeat: customer.isRepeat,
      });

      expect(waUrl).toContain("https://wa.me/919876543210?text=");
      const text = decodeUrlMessage(waUrl);
      expect(text).toContain("Hi Devendra!");
      expect(text).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
      expect(text).toContain("Thank you for your enquiry regarding your tattoo idea!");
      expect(text).toContain("When would be a good time for a quick chat?");
      expect(text).toContain("- Prerna");
    });

    test("generates deposit_pending URL for repeat customer in deposit stage", () => {
      const customer = {
        phone: "919876543210",
        name: "Meera Krishnan",
        latestBookingStage: "deposit_pending",
        isRepeat: true,
      };

      const waUrl = buildPersonalizedWhatsAppUrl({
        phone: customer.phone,
        name: customer.name,
        stage: customer.latestBookingStage || null,
        isRepeat: customer.isRepeat,
      });

      const text = decodeUrlMessage(waUrl);
      expect(text).toContain("Hi Meera!");
      expect(text).toContain("Your custom quote and session plan are ready!");
      expect(text).toContain("confirm with the deposit link");
      expect(text).toContain("- Prerna");
    });

    test("generates repeat client greeting when no active booking stage exists", () => {
      const customer = {
        phone: "9876543210",
        name: "Karan Johar",
        latestBookingStage: undefined,
        isRepeat: true,
      };

      const waUrl = buildPersonalizedWhatsAppUrl({
        phone: customer.phone,
        name: customer.name,
        stage: customer.latestBookingStage || null,
        isRepeat: customer.isRepeat,
      });

      const text = decodeUrlMessage(waUrl);
      expect(text).toContain("Hi Karan!");
      expect(text).toContain("Welcome back to Meet Prerna Tattoo Studio!");
      expect(text).toContain("Tell me what new idea or piece you have in mind!");
      expect(text).toContain("- Prerna");
    });

    test("handles non-repeat client with no stage using default studio greeting", () => {
      const customer = {
        phone: "9876543210",
        name: "Sneha Reddy",
        latestBookingStage: undefined,
        isRepeat: false,
      };

      const waUrl = buildPersonalizedWhatsAppUrl({
        phone: customer.phone,
        name: customer.name,
        stage: customer.latestBookingStage || null,
        isRepeat: customer.isRepeat,
      });

      const text = decodeUrlMessage(waUrl);
      expect(text).toContain("Hi Sneha!");
      expect(text).toContain("Thank you for connecting regarding your tattoo project!");
      expect(text).toContain("- Prerna");
    });
  });

  describe("Workspace Quick WhatsApp Composer Default & Template Generation", () => {
    const clientData = {
      phone: "+91 91234 56789",
      name: "Tanvi Deshmukh",
      serviceType: "Fine-line Floral",
      placement: "Shoulder",
    };

    test("computes default stage message with Prerna sender identity and client receiver", () => {
      for (const stage of V1_PIPELINE_STAGES) {
        const defaultMsg = buildPersonalizedWhatsAppMessage({
          phone: clientData.phone,
          name: clientData.name,
          stage,
          serviceType: clientData.serviceType,
          placement: clientData.placement,
        });

        // Addressed to client first name
        expect(defaultMsg).toContain("Hi Tanvi!");
        // Sender is Prerna
        expect(defaultMsg).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
        expect(defaultMsg).toContain("- Prerna");
      }
    });

    test("WHATSAPP_STAGE_TEMPLATES covers all 7 canonical stages with Prerna as sender", () => {
      expect(WHATSAPP_STAGE_TEMPLATES).toHaveLength(7);
      const stageKeys = WHATSAPP_STAGE_TEMPLATES.map((t) => t.stage);

      for (const stage of V1_PIPELINE_STAGES) {
        expect(stageKeys).toContain(stage);
      }

      for (const tpl of WHATSAPP_STAGE_TEMPLATES) {
        expect(tpl.text).toContain("It's Prerna from Meet Prerna Tattoo Studio.");
        expect(tpl.text).toContain("- Prerna");
        expect(tpl.text).toContain("{{name}}");
      }
    });

    test("applyWhatsAppTemplate correctly replaces {{name}} placeholder with client first name", () => {
      for (const tpl of WHATSAPP_STAGE_TEMPLATES) {
        const personalized = applyWhatsAppTemplate(tpl.text, clientData.name);
        expect(personalized).toContain("Hi Tanvi!");
        expect(personalized).not.toContain("{{name}}");
      }
    });

    test("composer URL construction uses default stage message when text is empty", () => {
      const waUrl = buildPersonalizedWhatsAppUrl({
        phone: clientData.phone,
        name: clientData.name,
        stage: "consultation_review",
        serviceType: clientData.serviceType,
        placement: clientData.placement,
      });

      expect(waUrl).toContain("https://wa.me/919123456789?text=");
      const text = decodeUrlMessage(waUrl);
      expect(text).toContain("Hi Tanvi!");
      expect(text).toContain("design references and tattoo concept for your Shoulder");
      expect(text).toContain("sizing, composition, and placement consultation");
      expect(text).toContain("- Prerna");
    });

    test("composer URL construction appends custom note when provided", () => {
      const customNote = "Please remember to wear loose clothing around the shoulder.";
      const waUrl = buildPersonalizedWhatsAppUrl({
        phone: clientData.phone,
        name: clientData.name,
        stage: "confirmed_scheduled",
        serviceType: clientData.serviceType,
        placement: clientData.placement,
        customNote,
      });

      const text = decodeUrlMessage(waUrl);
      expect(text).toContain("Hi Tanvi!");
      expect(text).toContain("Your fine-line floral session is confirmed");
      expect(text).toContain(customNote);
      expect(text).toContain("- Prerna");
    });
  });
});
