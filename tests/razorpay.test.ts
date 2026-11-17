import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import crypto from "crypto";
import {
  verifyWebhookSignature,
  verifyPaymentSignature,
} from "@/lib/services/razorpay";

describe("Razorpay Signature Verification Service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_mock_key_id";
    process.env.RAZORPAY_KEY_SECRET = "mock_secret_key_testing_12345";
    process.env.RAZORPAY_WEBHOOK_SECRET = "mock_webhook_secret_testing_67890";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("verifyWebhookSignature", () => {
    const secret = "test_webhook_secret_key_xyz";
    const rawBody = JSON.stringify({
      entity: "event",
      account_id: "acc_123",
      event: "payment_link.paid",
      payload: {
        payment_link: {
          id: "plink_test_987",
          amount: 500000,
          status: "paid",
        },
      },
    });

    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    it("should return true for valid HMAC SHA256 of rawBody and secret", () => {
      const isValid = verifyWebhookSignature(rawBody, validSignature, secret);
      expect(isValid).toBe(true);
    });

    it("should return false for tampered body", () => {
      const tamperedBody = rawBody.replace("500000", "100000");
      const isValid = verifyWebhookSignature(tamperedBody, validSignature, secret);
      expect(isValid).toBe(false);
    });

    it("should return false for tampered signature with same length", () => {
      // Modify last character of the valid 64-character hex signature
      const lastChar = validSignature.slice(-1);
      const replacedChar = lastChar === "a" ? "b" : "a";
      const tamperedSignature = validSignature.slice(0, -1) + replacedChar;

      expect(tamperedSignature.length).toBe(validSignature.length);
      const isValid = verifyWebhookSignature(rawBody, tamperedSignature, secret);
      expect(isValid).toBe(false);
    });

    it("should return false for signature of different length (empty or malformed)", () => {
      expect(verifyWebhookSignature(rawBody, "", secret)).toBe(false);
      expect(verifyWebhookSignature(rawBody, "short_invalid_sig", secret)).toBe(false);
      expect(verifyWebhookSignature(rawBody, validSignature + "extra", secret)).toBe(false);
    });

    it("should return false when verified against a different secret", () => {
      const wrongSecret = "completely_different_secret_key";
      const isValid = verifyWebhookSignature(rawBody, validSignature, wrongSecret);
      expect(isValid).toBe(false);
    });
  });

  describe("verifyPaymentSignature", () => {
    const orderId = "order_EKwxwAgIt421fa";
    const paymentId = "pay_29MoEhaboh72X4";
    const testSecret = "mock_secret_key_testing_12345";

    const generateSignature = (order: string, payment: string, secret: string) => {
      return crypto
        .createHmac("sha256", secret)
        .update(`${order}|${payment}`)
        .digest("hex");
    };

    it("should return true for correct signature of ${orderId}|${paymentId}", () => {
      const validSignature = generateSignature(orderId, paymentId, testSecret);
      const isValid = verifyPaymentSignature(orderId, paymentId, validSignature);
      expect(isValid).toBe(true);
    });

    it("should return false for tampered signature with same length", () => {
      const validSignature = generateSignature(orderId, paymentId, testSecret);
      const lastChar = validSignature.slice(-1);
      const replacedChar = lastChar === "0" ? "1" : "0";
      const tamperedSignature = validSignature.slice(0, -1) + replacedChar;

      const isValid = verifyPaymentSignature(orderId, paymentId, tamperedSignature);
      expect(isValid).toBe(false);
    });

    it("should return false when orderId is tampered", () => {
      const validSignature = generateSignature(orderId, paymentId, testSecret);
      const isValid = verifyPaymentSignature("order_different_123", paymentId, validSignature);
      expect(isValid).toBe(false);
    });

    it("should return false when paymentId is tampered", () => {
      const validSignature = generateSignature(orderId, paymentId, testSecret);
      const isValid = verifyPaymentSignature(orderId, "pay_different_456", validSignature);
      expect(isValid).toBe(false);
    });

    it("should return false for malformed or different length signature", () => {
      expect(verifyPaymentSignature(orderId, paymentId, "")).toBe(false);
      expect(verifyPaymentSignature(orderId, paymentId, "invalid_sig")).toBe(false);
      expect(
        verifyPaymentSignature(
          orderId,
          paymentId,
          generateSignature(orderId, paymentId, testSecret) + "00"
        )
      ).toBe(false);
    });

    it("should throw an error if RAZORPAY_KEY_SECRET is not configured", () => {
      delete process.env.RAZORPAY_KEY_SECRET;
      expect(() => {
        verifyPaymentSignature(orderId, paymentId, "some_sig");
      }).toThrow("Razorpay credentials are not configured");
    });
  });
});
