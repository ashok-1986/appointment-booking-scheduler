import { describe, it, expect } from "bun:test";
import { insertConsentRecordSchema, consentRecords } from "@/lib/schema";
import { sendConsentForm, signConsentForm, getConsentForm } from "@/lib/workflows";

describe("Consent Records Unified Schema", () => {
  it("should allow creating a pending consent record with reminder tracking and nullable pre-signing fields", () => {
    const pendingRecord = {
      id: "cr_pending_123",
      bookingId: "b_123",
      clientId: "c_123",
      status: "pending",
      reminderCount: 0,
      ageVerified: false,
      procedureConsent: false,
      photographyConsent: false,
      marketingConsent: false,
    };

    const parsed = insertConsentRecordSchema.safeParse(pendingRecord);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("pending");
      expect(parsed.data.reminderCount).toBe(0);
      expect(parsed.data.legalName).toBeUndefined();
    }
  });

  it("should validate complete signed consent records", () => {
    const signedRecord = {
      id: "cr_signed_123",
      bookingId: "b_123",
      clientId: "c_123",
      status: "signed",
      reminderCount: 1,
      reminderSentAt: new Date(),
      legalName: "Maya Rao",
      dateOfBirth: "1995-05-15",
      ageVerified: true,
      procedureConsent: true,
      photographyConsent: true,
      marketingConsent: false,
      signatureImageUrl: "https://storage.meetprerna.com/signatures/sig_123.png",
      healthDisclosures: { allergies: false },
      signedAt: new Date(),
    };

    const parsed = insertConsentRecordSchema.safeParse(signedRecord);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("signed");
      expect(parsed.data.legalName).toBe("Maya Rao");
    }
  });

  it("should allow creating expired consent records", () => {
    const expiredRecord = {
      id: "cr_expired_123",
      bookingId: "b_123",
      clientId: "c_123",
      status: "expired",
      reminderCount: 3,
    };

    const parsed = insertConsentRecordSchema.safeParse(expiredRecord);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("expired");
      expect(parsed.data.reminderCount).toBe(3);
    }
  });

  it("should verify workflow functions are exported and typed correctly", () => {
    expect(typeof sendConsentForm).toBe("function");
    expect(typeof signConsentForm).toBe("function");
    expect(typeof getConsentForm).toBe("function");
  });
});
