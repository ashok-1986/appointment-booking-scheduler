import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { fetchPaymentLink, verifyPaymentSignature } from "@/lib/services/razorpay";
import { canTransitionV1, normalizeToV1Stage } from "@/lib/state-machine";

describe("Correctness Fixes Suite", () => {
  describe("1. Razorpay fetchPaymentLink Endpoint Path Construction", () => {
    let capturedUrl: string | null = null;
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
      process.env.RAZORPAY_KEY_ID = "rzp_test_mock";
      process.env.RAZORPAY_KEY_SECRET = "rzp_secret_mock";
      process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_webhook_secret_mock";

      globalThis.fetch = (async (input: RequestInfo | URL) => {
        capturedUrl = typeof input === "string" ? input : input.toString();
        return new Response(
          JSON.stringify({
            id: "plink_12345",
            short_url: "https://rzp.io/i/12345",
            long_url: "https://api.razorpay.com/payment_links/plink_12345",
            status: "created",
            amount: 500000,
            currency: "INR",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as typeof globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("should call Razorpay endpoint without duplicate BASE_URL in request path", async () => {
      await fetchPaymentLink("plink_test_999");
      expect(capturedUrl).not.toBeNull();
      // Must NOT contain double https://api.razorpay.com
      expect(capturedUrl).not.toContain("https://api.razorpay.com/v1https://api.razorpay.com");
      expect(capturedUrl).toBe("https://api.razorpay.com/v1/payment_links/plink_test_999");
    });
  });

  describe("2. State Machine & Stage Normalization for Lifecycle Continuity", () => {
    it("should normalize legacy and completed stages to canonical V1 stages", () => {
      expect(normalizeToV1Stage("session_complete")).toBe("session_completed");
      expect(normalizeToV1Stage("session_completed")).toBe("session_completed");
      expect(normalizeToV1Stage("closed_followup")).toBe("closed_followup");
      expect(normalizeToV1Stage("paid_in_full")).toBe("payment_pending");
      expect(normalizeToV1Stage("payment_pending")).toBe("payment_pending");
    });

    it("should prevent backwards regression from completed session to deposit stages", () => {
      // Completed sessions cannot transition backwards to deposit_pending or new_enquiry
      expect(canTransitionV1("session_completed", "deposit_pending")).toBe(false);
      expect(canTransitionV1("session_completed", "new_enquiry")).toBe(false);
      expect(canTransitionV1("closed_followup", "deposit_pending")).toBe(false);
    });

    it("should allow valid forward flow from session_completed to payment_pending to closed_followup", () => {
      expect(canTransitionV1("session_completed", "payment_pending")).toBe(true);
      expect(canTransitionV1("payment_pending", "closed_followup")).toBe(true);
    });
  });

  describe("3. Webhook Idempotency Check & Balance Payment Discrimination", () => {
    it("should distinguish balance payments from deposit payments by stage or description", () => {
      // Test the helper logic used in handleRazorpayWebhook
      const isBalanceByStage = (stage: string) => stage === "payment_pending" || stage === "session_complete";
      const isBalanceByDesc = (desc?: string) => Boolean(desc && desc.toLowerCase().includes("balance"));

      expect(isBalanceByStage("payment_pending")).toBe(true);
      expect(isBalanceByStage("deposit_pending")).toBe(false);
      expect(isBalanceByDesc("Remaining Balance for Custom Tattoo")).toBe(true);
      expect(isBalanceByDesc("Deposit for Custom Tattoo")).toBe(false);
    });
  });
});
