import { describe, it, expect, beforeEach } from "bun:test";
import { checkRateLimit, resetRateLimiter, extractClientIp } from "@/lib/rate-limiter";
import { POST } from "@/app/api/enquiry/route";
import { NextRequest } from "next/server";

describe("Enquiry Rate Limiter & Abuse Prevention", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("should allow requests within rate limit", () => {
    const ip = "192.168.1.100";
    const res1 = checkRateLimit(ip, { limit: 3, windowMs: 1000 });
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit(ip, { limit: 3, windowMs: 1000 });
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);
  });

  it("should block requests exceeding rate limit threshold", () => {
    const ip = "192.168.1.200";
    checkRateLimit(ip, { limit: 2, windowMs: 1000 });
    checkRateLimit(ip, { limit: 2, windowMs: 1000 });

    const blocked = checkRateLimit(ip, { limit: 2, windowMs: 1000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("should correctly extract client IP from proxy headers", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.195, 70.41.3.18",
    });
    const ip = extractClientIp(headers);
    expect(ip).toBe("203.0.113.195");
  });

  it("should extract client IP from x-real-ip when x-forwarded-for is missing", () => {
    const headers = new Headers({
      "x-real-ip": "198.51.100.42",
    });
    const ip = extractClientIp(headers);
    expect(ip).toBe("198.51.100.42");
  });

  it("should fallback to 127.0.0.1 when headers are missing", () => {
    const headers = new Headers();
    const ip = extractClientIp(headers);
    expect(ip).toBe("127.0.0.1");
  });

  it("should reset quota after window expires", async () => {
    const ip = "10.0.0.5";
    const opt = { limit: 1, windowMs: 50 };

    const first = checkRateLimit(ip, opt);
    expect(first.allowed).toBe(true);

    const blocked = checkRateLimit(ip, opt);
    expect(blocked.allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 60));

    const afterExpiry = checkRateLimit(ip, opt);
    expect(afterExpiry.allowed).toBe(true);
    expect(afterExpiry.remaining).toBe(0);
  });

  it("should opportunistically evict expired keys when store size exceeds 1000", async () => {
    resetRateLimiter();
    // Insert 1001 entries with short TTL
    for (let i = 0; i < 1001; i++) {
      checkRateLimit(`test-ip-${i}`, { limit: 5, windowMs: 20 });
    }
    // Wait for them to expire
    await new Promise((r) => setTimeout(r, 30));

    // Trigger checkRateLimit which should trigger eviction of the expired entries
    const res = checkRateLimit("fresh-ip", { limit: 5, windowMs: 60000 });
    expect(res.allowed).toBe(true);
  });

  describe("API Route Honeypot & Rate Limiting Integration", () => {
    it("should trap honeypot submissions and return bot_ack without database errors", async () => {
      const req = new NextRequest("http://localhost:4000/api/enquiry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.99",
        },
        body: JSON.stringify({
          name: "Spam Bot",
          email: "bot@example.com",
          phone: "+1234567890",
          hp_website: "https://spamlink.ru",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.bookingId).toBe("bot_ack");
    });

    it("should return 429 when rate limit is exceeded on enquiry endpoint", async () => {
      const testIp = "203.0.113.55";

      // Consume 5 allowed requests
      for (let i = 0; i < 5; i++) {
        const req = new NextRequest("http://localhost:4000/api/enquiry", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": testIp,
          },
          body: JSON.stringify({
            name: "Spam Bot",
            email: "bot@example.com",
            phone: "+1234567890",
            hp_website: "https://spamlink.ru",
          }),
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
      }

      // 6th request should hit 429 rate limit
      const req6 = new NextRequest("http://localhost:4000/api/enquiry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": testIp,
        },
        body: JSON.stringify({
          name: "Real User",
          email: "real@example.com",
          phone: "+1234567890",
        }),
      });

      const res6 = await POST(req6);
      expect(res6.status).toBe(429);
      expect(res6.headers.get("Retry-After")).toBe("60");
      const json = await res6.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Too many enquiry submissions");
    });
  });
});
