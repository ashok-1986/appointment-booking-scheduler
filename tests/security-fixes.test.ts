import { describe, it, expect } from "bun:test";
import crypto from "crypto";
import { detectImageMagicBytes } from "@/app/api/upload/route";
import { verifyWhatsAppWebhookSignature } from "@/lib/services/whatsapp";
import { escapeHtml } from "@/lib/utils";
import { EMAIL_TEMPLATES } from "@/lib/services/email";

describe("Security Fixes Suite", () => {
  describe("1. Upload Route: Magic Bytes & Extension Enforcement", () => {
    it("should correctly identify genuine JPEG buffer", () => {
      // JPEG magic: FF D8 FF
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const detected = detectImageMagicBytes(jpegBuffer);
      expect(detected).not.toBeNull();
      expect(detected?.mime).toBe("image/jpeg");
      expect(detected?.ext).toBe(".jpg");
    });

    it("should correctly identify genuine PNG buffer", () => {
      // PNG magic: 89 50 4E 47 0D 0A 1A 0A
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const detected = detectImageMagicBytes(pngBuffer);
      expect(detected).not.toBeNull();
      expect(detected?.mime).toBe("image/png");
      expect(detected?.ext).toBe(".png");
    });

    it("should correctly identify genuine WebP buffer", () => {
      // WebP magic: RIFF....WEBP
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      const detected = detectImageMagicBytes(webpBuffer);
      expect(detected).not.toBeNull();
      expect(detected?.mime).toBe("image/webp");
      expect(detected?.ext).toBe(".webp");
    });

    it("should reject HTML, PHP, or executable content disguised with image header or extension", () => {
      const htmlPayload = Buffer.from("<html><script>alert('pwned')</script></html>");
      expect(detectImageMagicBytes(htmlPayload)).toBeNull();

      const phpPayload = Buffer.from("<?php echo 'malicious code'; ?>");
      expect(detectImageMagicBytes(phpPayload)).toBeNull();
    });

    it("should reject truncated or empty buffers", () => {
      expect(detectImageMagicBytes(Buffer.from([]))).toBeNull();
      expect(detectImageMagicBytes(Buffer.from([0xff, 0xd8]))).toBeNull();
    });
  });

  describe("2. WhatsApp Webhook: HMAC-SHA256 Signature Verification", () => {
    const testSecret = "my_super_secret_wa_app_secret";
    const testPayload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ id: "12345", changes: [] }],
    });

    it("should verify valid signature with sha256= prefix", () => {
      const hash = crypto.createHmac("sha256", testSecret).update(testPayload).digest("hex");
      const signatureHeader = `sha256=${hash}`;

      const isValid = verifyWhatsAppWebhookSignature(testPayload, signatureHeader, testSecret);
      expect(isValid).toBe(true);
    });

    it("should verify valid signature with bare hash", () => {
      const hash = crypto.createHmac("sha256", testSecret).update(testPayload).digest("hex");

      const isValid = verifyWhatsAppWebhookSignature(testPayload, hash, testSecret);
      expect(isValid).toBe(true);
    });

    it("should reject tampered body", () => {
      const hash = crypto.createHmac("sha256", testSecret).update(testPayload).digest("hex");
      const signatureHeader = `sha256=${hash}`;

      const tamperedPayload = testPayload + " ";
      const isValid = verifyWhatsAppWebhookSignature(tamperedPayload, signatureHeader, testSecret);
      expect(isValid).toBe(false);
    });

    it("should reject signature computed with wrong secret", () => {
      const hash = crypto.createHmac("sha256", "wrong_secret").update(testPayload).digest("hex");
      const signatureHeader = `sha256=${hash}`;

      const isValid = verifyWhatsAppWebhookSignature(testPayload, signatureHeader, testSecret);
      expect(isValid).toBe(false);
    });

    it("should reject malformed or invalid signature lengths without throwing", () => {
      expect(verifyWhatsAppWebhookSignature(testPayload, "", testSecret)).toBe(false);
      expect(verifyWhatsAppWebhookSignature(testPayload, "invalid_short", testSecret)).toBe(false);
      expect(verifyWhatsAppWebhookSignature(testPayload, null, testSecret)).toBe(false);
      expect(verifyWhatsAppWebhookSignature(testPayload, undefined, testSecret)).toBe(false);
    });
  });

  describe("3. Email Templates: HTML Sanitization & Injection Prevention", () => {
    it("should escape HTML special characters", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe("&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;");
      expect(escapeHtml("A & B \"quote\"")).toBe("A &amp; B &quot;quote&quot;");
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
    });

    it("should sanitize client name in enquiryConfirmation email HTML", () => {
      const maliciousName = '<img src=x onerror="alert(1)">';
      const email = EMAIL_TEMPLATES.enquiryConfirmation(maliciousName);

      expect(email.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
      expect(email.html).not.toContain("<img src=x");
      // Plain text should keep human readable format
      expect(email.text).toContain(maliciousName);
    });

    it("should sanitize address and preparation in sessionConfirmation email HTML", () => {
      const maliciousPrep = "Bring water.\n<script>fetch('http://attacker.com')</script>";
      const maliciousAddress = "Studio 4 <svg onload=alert(2)>";
      const email = EMAIL_TEMPLATES.sessionConfirmation("Alice", "Tomorrow 2PM", maliciousAddress, maliciousPrep);

      expect(email.html).toContain("&lt;script&gt;fetch(&#039;http://attacker.com&#039;)&lt;/script&gt;");
      expect(email.html).not.toContain("<script>");
      expect(email.html).toContain("&lt;svg onload=alert(2)&gt;");
      expect(email.html).not.toContain("<svg");
      expect(email.html).toContain("<br/>");
    });

    it("should sanitize reason in decline email HTML", () => {
      const maliciousReason = 'Schedule full <b>bold</b> <iframe src="evil.com"></iframe>';
      const email = EMAIL_TEMPLATES.decline("Bob", maliciousReason);

      expect(email.html).toContain("&lt;b&gt;bold&lt;/b&gt;");
      expect(email.html).toContain("&lt;iframe src=&quot;evil.com&quot;&gt;&lt;/iframe&gt;");
      expect(email.html).not.toContain("<iframe");
    });
  });
});
