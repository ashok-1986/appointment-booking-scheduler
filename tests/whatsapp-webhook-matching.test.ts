import { describe, it, expect } from "bun:test";
import { normalizePhoneNumber, selectActiveBooking } from "@/lib/services/phone-normalizer";

describe("WhatsApp Inbound Message Routing", () => {
  it("should extract search variants for international phone formats", () => {
    const res = normalizePhoneNumber("+91 98765 43210");
    expect(res.rawDigits).toBe("919876543210");
    expect(res.e164).toBe("+919876543210");
    expect(res.national).toBe("9876543210");
    expect(res.queryVariants).toContain("+919876543210");
    expect(res.queryVariants).toContain("919876543210");
    expect(res.queryVariants).toContain("9876543210");
  });

  it("should prioritize active non-terminal bookings over cancelled or closed ones", () => {
    const sampleBookings = [
      { id: "b1_cancelled", stage: "cancelled", createdAt: new Date("2026-11-01") },
      { id: "b2_active", stage: "confirmed_scheduled", createdAt: new Date("2026-10-15") },
      { id: "b3_closed", stage: "closed_followup", createdAt: new Date("2026-11-05") },
    ];

    const matched = selectActiveBooking(sampleBookings);
    expect(matched).not.toBeNull();
    expect(matched?.id).toBe("b2_active");
  });

  it("should fall back to the most recent booking if all bookings are terminal", () => {
    const sampleBookings = [
      { id: "b1_old_closed", stage: "closed_followup", createdAt: new Date("2026-09-01") },
      { id: "b2_recent_closed", stage: "closed_followup", createdAt: new Date("2026-10-01") },
    ];

    const matched = selectActiveBooking(sampleBookings);
    expect(matched?.id).toBe("b2_recent_closed");
  });
});
