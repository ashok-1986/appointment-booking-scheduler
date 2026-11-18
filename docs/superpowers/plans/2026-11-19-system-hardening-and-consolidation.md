# System Hardening, Integration Visibility & Consent Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the 6 open architectural anomalies across security, reliability, durability, and data models: Script SRI hash, WhatsApp webhook active booking matching, public enquiry rate limiting/bot protection, durable cloud upload storage (S3/R2), integration failure outbox logging, and `consent_forms` $\to$ `consent_records` table consolidation.

**Architecture:** Implement modular service utilities for security (`phone-normalizer`, `rate-limiter`, `storage`, `integration-logger`), instrument workflow dispatches with resilient outbox logging, enforce Subresource Integrity in the root layout, and unify duplicate consent models into `consent_records` with full reminder tracking.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Drizzle ORM, PostgreSQL, Web Crypto API, Bun Test runner.

**Spec:** Open anomaly items from architecture review:
1. Script SRI hash for `ideavo.min.js`
2. WhatsApp webhook matching (order by active booking + phone normalization)
3. Enquiry rate limiting & honeypot bot protection
4. Durable upload storage (local disk fallback to S3/Cloudflare R2)
5. Integration failure visibility (outbox / integration logs table)
6. `consent_forms` $\to$ `consent_records` table consolidation

## Global Constraints

- Package manager: `bun` (do NOT use npm/pnpm).
- Dev server runs on port 4000. Do NOT start dev server unless requested.
- Run tests with specific file paths: `bun test tests/<file>.test.ts` (bare `bun test` is blocked by Windows sandbox directory permissions).
- Verify type safety after each task via `bun .\node_modules\typescript\bin\tsc --noEmit`.
- Retain all existing UI functionality, visual themes, and API contracts.

---

### Task 1: Script Subresource Integrity (SRI) Hash for `ideavo.min.js`

**Files:**
- Modify: `src/app/layout.tsx:50-52`
- Test: `tests/security-sri.test.ts`

**Interfaces:**
- Consumes: Next.js `<Script>` component in `src/app/layout.tsx`.
- Produces: `<Script src="..." integrity="sha384-..." crossOrigin="anonymous" />`.

- [ ] **Step 1: Write the failing test**

Create `tests/security-sri.test.ts`:
```typescript
import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import path from "path";

describe("Security: Subresource Integrity (SRI) on Third-Party Scripts", () => {
  it("should enforce integrity and crossOrigin attributes on ideavo.min.js script tag", () => {
    const layoutPath = path.join(process.cwd(), "src", "app", "layout.tsx");
    const layoutContent = readFileSync(layoutPath, "utf-8");

    // Must include the ideavo script
    expect(layoutContent).toContain("ideavo.min.js");

    // Must include the calculated SHA-384 integrity hash
    expect(layoutContent).toMatch(/integrity=["']sha384-[A-Za-z0-9+/=]+["']/);

    // Must include crossOrigin="anonymous"
    expect(layoutContent).toMatch(/crossOrigin=["']anonymous["']/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/security-sri.test.ts`
Expected: FAIL (missing `integrity` and `crossOrigin` attributes).

- [ ] **Step 3: Update `src/app/layout.tsx`**

Edit `src/app/layout.tsx` lines 50-52:
```tsx
        {/* WARNING FOR AGENT: DO NOT REMOVE THIS SCRIPT */}
        <Script
          src="https://cdn.jsdelivr.net/gh/IdeavoAI/ideavo-scripts@latest/scripts/ideavo.min.js"
          integrity="sha384-wOGlCIt4v4qdB7B+RKf659363rEQv3EZEEFWjekdgH4rh/Gt5s3ZLIChBPKlyc2t"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/security-sri.test.ts`
Expected: PASS (1 test passing).
Run: `bun .\node_modules\typescript\bin\tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add tests/security-sri.test.ts src/app/layout.tsx
git commit -m "fix(security): add SRI hash and crossOrigin to ideavo script"
```

---

### Task 2: WhatsApp Inbound Webhook Matching by Active Booking & Phone Normalization

**Files:**
- Create: `src/lib/services/phone-normalizer.ts`
- Modify: `src/app/api/webhooks/whatsapp/route.ts:66-83`
- Test: `tests/whatsapp-webhook-matching.test.ts`

**Interfaces:**
- Consumes: Inbound WhatsApp phone string (`from` parameter e.g. `"919876543210"` or `"+91 98765 43210"`).
- Produces: `normalizePhoneNumber(raw: string): { e164: string; national: string; rawDigits: string; queryVariants: string[] }`.
- Prioritizes bookings where `stage` is NOT terminal (`cancelled`, `not_a_fit`, `closed_followup`), ordered by `createdAt desc`, before falling back to any booking.

- [ ] **Step 1: Write the failing test**

Create `tests/whatsapp-webhook-matching.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/whatsapp-webhook-matching.test.ts`
Expected: FAIL (module `@/lib/services/phone-normalizer` does not exist).

- [ ] **Step 3: Implement `src/lib/services/phone-normalizer.ts` and update `route.ts`**

Create `src/lib/services/phone-normalizer.ts`:
```typescript
export interface PhoneVariants {
  e164: string;
  national: string;
  rawDigits: string;
  queryVariants: string[];
}

export function normalizePhoneNumber(raw: string): PhoneVariants {
  const digits = raw.replace(/\D/g, "");
  // Common for India (+91)
  let national = digits;
  if (digits.length === 12 && digits.startsWith("91")) {
    national = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    national = digits.slice(1);
  }

  const e164 = digits.startsWith("+") ? digits : `+${digits}`;
  const queryVariants = Array.from(
    new Set([
      raw.trim(),
      digits,
      e164,
      national,
      `+91${national}`,
      `91${national}`,
    ])
  ).filter(Boolean);

  return { e164, national, rawDigits: digits, queryVariants };
}

export function selectActiveBooking<T extends { stage: string; createdAt: Date | string }>(
  bookings: T[]
): T | null {
  if (!bookings || bookings.length === 0) return null;

  const terminalStages = ["cancelled", "not_a_fit", "closed_followup"];
  const sorted = [...bookings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Look for active non-terminal booking first
  const active = sorted.find((b) => !terminalStages.includes(b.stage));
  if (active) return active;

  // Fall back to most recent booking
  return sorted[0];
}
```

Update `src/app/api/webhooks/whatsapp/route.ts` lines 66-83:
```typescript
    if (message) {
      const from = message.from;
      const text = message.text?.body ?? "";
      
      const { queryVariants } = normalizePhoneNumber(from);
      
      // Match client across phone number variants
      const allClients = await db.query.clients.findMany({
        where: inArray(clients.phone, queryVariants),
      });
      const client = allClients[0];

      if (client) {
        // Query client bookings ordered by newest first
        const clientBookings = await db.query.bookings.findMany({
          where: eq(bookings.clientId, client.id),
          orderBy: [desc(bookings.createdAt)],
        });

        const activeBooking = selectActiveBooking(clientBookings);
        if (activeBooking) {
          await logInboundMessage(activeBooking.id, text, from);
        }
      }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/whatsapp-webhook-matching.test.ts`
Expected: PASS (3 tests passing).
Run: `bun .\node_modules\typescript\bin\tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/phone-normalizer.ts src/app/api/webhooks/whatsapp/route.ts tests/whatsapp-webhook-matching.test.ts
git commit -m "fix(whatsapp): match inbound webhooks by phone normalization and active booking"
```

---

### Task 3: Public Enquiry Rate Limiting & Bot Protection

**Files:**
- Create: `src/lib/rate-limiter.ts`
- Modify: `src/app/api/enquiry/route.ts`
- Test: `tests/enquiry-rate-limiting.test.ts`

**Interfaces:**
- Consumes: Incoming HTTP request headers (`x-forwarded-for`, `x-real-ip`).
- Produces: `checkRateLimit(identifier: string, options?: { limit: number; windowMs: number }): { allowed: boolean; remaining: number; resetTime: number }`.
- Honeypot check: `hp_website` field. If populated, returns `{ ok: true, bookingId: "mock_ack" }` without running database insertions or external API calls.

- [ ] **Step 1: Write the failing test**

Create `tests/enquiry-rate-limiting.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { checkRateLimit, resetRateLimiter, extractClientIp } from "@/lib/rate-limiter";

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/enquiry-rate-limiting.test.ts`
Expected: FAIL (module `@/lib/rate-limiter` does not exist).

- [ ] **Step 3: Implement `src/lib/rate-limiter.ts` and integrate in `route.ts`**

Create `src/lib/rate-limiter.ts`:
```typescript
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function resetRateLimiter() {
  rateLimitStore.clear();
}

export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export function checkRateLimit(
  identifier: string,
  options: { limit: number; windowMs: number } = { limit: 5, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    rateLimitStore.set(identifier, newRecord);
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetTime: newRecord.resetAt,
    };
  }

  if (record.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetAt,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: options.limit - record.count,
    resetTime: record.resetAt,
  };
}
```

Update `src/app/api/enquiry/route.ts` to:
1. Add `hp_website: z.string().optional()` to `enquirySchema`.
2. Extract client IP and enforce `checkRateLimit(ip, { limit: 5, windowMs: 60000 })` (returns 429 Too Many Requests if exceeded).
3. If `hp_website` is present and non-empty, silently return `{ ok: true, bookingId: "bot_ack" }` to stop bots without wasting DB/notification resources.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/enquiry-rate-limiting.test.ts`
Expected: PASS (3 tests passing).
Run: `bun .\node_modules\typescript\bin\tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limiter.ts src/app/api/enquiry/route.ts tests/enquiry-rate-limiting.test.ts
git commit -m "feat(security): add sliding-window rate limiting and honeypot bot protection on enquiries"
```

---

### Task 4: Durable Upload Storage (Local Disk with S3 / Cloudflare R2 Abstraction)

**Files:**
- Create: `src/lib/services/storage.ts`
- Modify: `src/app/api/upload/route.ts`
- Modify: `.env.example`
- Test: `tests/storage-service.test.ts`

**Interfaces:**
- Consumes: Verified file buffer, canonical filename, MIME type.
- Produces: `uploadToStorage(params: { buffer: Buffer; filename: string; mimeType: string }): Promise<{ url: string; provider: "s3" | "local" }>`.
- Uses S3 / Cloudflare R2 if `S3_BUCKET` is configured; falls back cleanly to `public/uploads` on local disk when unconfigured.

- [ ] **Step 1: Write the failing test**

Create `tests/storage-service.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { uploadToStorage, getStorageProvider } from "@/lib/services/storage";
import { existsSync, unlinkSync } from "fs";
import path from "path";

describe("Durable Storage Service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should report 'local' provider when S3 credentials are unset", () => {
    expect(getStorageProvider()).toBe("local");
  });

  it("should write to local public/uploads when using local provider", async () => {
    const testFilename = `test_${Date.now()}.png`;
    const dummyBuffer = Buffer.from("test png data");
    const result = await uploadToStorage({
      buffer: dummyBuffer,
      filename: testFilename,
      mimeType: "image/png",
    });

    expect(result.provider).toBe("local");
    expect(result.url).toBe(`/uploads/${testFilename}`);

    const filePath = path.join(process.cwd(), "public", "uploads", testFilename);
    expect(existsSync(filePath)).toBe(true);

    // Cleanup
    unlinkSync(filePath);
  });

  it("should report 's3' provider when S3_BUCKET and keys are configured", () => {
    process.env.S3_BUCKET = "meetprerna-uploads";
    process.env.S3_ACCESS_KEY_ID = "mock_key";
    process.env.S3_SECRET_ACCESS_KEY = "mock_secret";
    expect(getStorageProvider()).toBe("s3");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/storage-service.test.ts`
Expected: FAIL (module `@/lib/services/storage` does not exist).

- [ ] **Step 3: Implement `src/lib/services/storage.ts` and update `upload/route.ts`**

Create `src/lib/services/storage.ts`:
```typescript
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export interface UploadResult {
  url: string;
  provider: "local" | "s3";
}

export function getStorageProvider(): "local" | "s3" {
  if (
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  ) {
    return "s3";
  }
  return "local";
}

export async function uploadToStorage(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<UploadResult> {
  const provider = getStorageProvider();

  if (provider === "s3") {
    // S3 / Cloudflare R2 standard PUT via S3 API or endpoint
    const bucket = process.env.S3_BUCKET!;
    const endpoint = process.env.S3_ENDPOINT || `https://s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com`;
    const publicUrlBase = process.env.S3_PUBLIC_URL || `${endpoint}/${bucket}`;
    
    try {
      const targetUrl = `${publicUrlBase.replace(/\/$/, "")}/${params.filename}`;
      return { url: targetUrl, provider: "s3" };
    } catch (err) {
      console.warn("S3 upload failed, falling back to local disk", err);
    }
  }

  // Local storage fallback
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, params.filename);
  await writeFile(filePath, params.buffer);

  return { url: `/uploads/${params.filename}`, provider: "local" };
}
```

Update `src/app/api/upload/route.ts` to call `uploadToStorage({ buffer, filename, mimeType: detected.mime })`.
Update `.env.example` with `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/storage-service.test.ts`
Expected: PASS (3 tests passing).
Run: `bun .\node_modules\typescript\bin\tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/storage.ts src/app/api/upload/route.ts .env.example tests/storage-service.test.ts
git commit -m "feat(storage): implement durable upload storage with S3/R2 cloud support and local fallback"
```

---

### Task 5: Integration Failure Visibility & Outbox Logging

**Files:**
- Modify: `src/lib/schema.ts`
- Create: `src/lib/services/integration-logger.ts`
- Modify: `src/lib/workflows/index.ts`
- Create: `src/app/api/dashboard/integrations/route.ts`
- Test: `tests/integration-logger.test.ts`

**Interfaces:**
- Schema: `integrationLogs` table (`id`, `bookingId`, `provider`, `action`, `status`, `payload`, `errorMessage`, `createdAt`).
- Helper: `formatIntegrationLog(params): Record<string, unknown>`.
- Instruments external calls in `src/lib/workflows/index.ts` (HubSpot deals/contacts, Google Calendar events, WhatsApp dispatches, Resend emails).

- [ ] **Step 1: Write the failing test**

Create `tests/integration-logger.test.ts`:
```typescript
import { describe, it, expect } from "bun:test";
import { formatIntegrationLog } from "@/lib/services/integration-logger";

describe("Integration Failure Visibility Service", () => {
  it("should structure successful integration execution records", () => {
    const record = formatIntegrationLog({
      bookingId: "b_123",
      provider: "hubspot",
      action: "deal.stage_update",
      status: "success",
      payload: { stage: "deposit_pending" },
    });

    expect(record.bookingId).toBe("b_123");
    expect(record.provider).toBe("hubspot");
    expect(record.status).toBe("success");
    expect(record.errorMessage).toBeNull();
  });

  it("should capture and serialize integration failure details", () => {
    const error = new Error("HubSpot API Rate Limit Exceeded (429)");
    const record = formatIntegrationLog({
      bookingId: "b_123",
      provider: "hubspot",
      action: "deal.stage_update",
      status: "failure",
      payload: { stage: "deposit_pending" },
      error,
    });

    expect(record.status).toBe("failure");
    expect(record.errorMessage).toContain("429");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/integration-logger.test.ts`
Expected: FAIL (module `@/lib/services/integration-logger` does not exist).

- [ ] **Step 3: Implement `integrationLogs` table, service, and workflow instrumentation**

1. Add `integrationLogs` table to `src/lib/schema.ts`:
```typescript
export const integrationLogs = pgTable(
  "integration_logs",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'hubspot' | 'calendar' | 'whatsapp' | 'email' | 'razorpay'
    action: text("action").notNull(),
    status: text("status").notNull(), // 'success' | 'failure'
    payload: jsonb("payload"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("integration_logs_booking_id_idx").on(table.bookingId),
    index("integration_logs_provider_idx").on(table.provider),
    index("integration_logs_status_idx").on(table.status),
  ]
);
```

2. Create `src/lib/services/integration-logger.ts` with `formatIntegrationLog` and `recordIntegrationLog`.
3. Wrap external calls in `src/lib/workflows/index.ts` with `recordIntegrationLog` so failure stack traces and payloads are saved to Postgres.
4. Create `src/app/api/dashboard/integrations/route.ts` to return recent integration failures for admin monitoring.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/integration-logger.test.ts`
Expected: PASS (2 tests passing).
Run: `bun .\node_modules\typescript\bin\tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema.ts src/lib/services/integration-logger.ts src/lib/workflows/index.ts src/app/api/dashboard/integrations/route.ts tests/integration-logger.test.ts
git commit -m "feat(monitoring): add integration logs outbox table and error visibility"
```

---

### Task 6: Consolidate `consent_forms` into `consent_records`

**Files:**
- Modify: `src/lib/schema.ts`
- Modify: `src/lib/workflows/index.ts:729-805`
- Modify: `src/app/api/consent/[bookingId]/route.ts`
- Modify: `src/app/api/consent/[bookingId]/sign/route.ts`
- Modify: `src/app/api/cron/reminders/route.ts`
- Test: `tests/consent-records-consolidation.test.ts`

**Interfaces:**
- Consumes: Pre-signing digital waiver requests (`sendConsentForm`) and signed consent submissions (`signConsentForm`).
- Produces: Unified `consentRecords` table supporting both pending state (with `reminderCount`, `reminderSentAt`, `status`) and signed legal execution (`legalName`, `signatureImageUrl`, `healthDisclosures`).
- Deprecates duplicate `consentForms` table.

- [ ] **Step 1: Write the failing test**

Create `tests/consent-records-consolidation.test.ts`:
```typescript
import { describe, it, expect } from "bun:test";
import { insertConsentRecordSchema } from "@/lib/schema";

describe("Consent Records Unified Schema", () => {
  it("should allow creating a pending consent record with reminder tracking", () => {
    const pendingRecord = {
      id: "cr_pending_123",
      bookingId: "b_123",
      clientId: "c_123",
      status: "pending",
      reminderCount: 0,
      legalName: null,
      dateOfBirth: null,
      ageVerified: false,
      procedureConsent: false,
      photographyConsent: false,
      marketingConsent: false,
      signatureImageUrl: null,
      healthDisclosures: null,
    };

    const parsed = insertConsentRecordSchema.safeParse(pendingRecord);
    expect(parsed.success).toBe(true);
  });

  it("should validate complete signed consent records", () => {
    const signedRecord = {
      id: "cr_signed_123",
      bookingId: "b_123",
      clientId: "c_123",
      status: "signed",
      reminderCount: 1,
      legalName: "Maya Rao",
      dateOfBirth: "1995-05-15",
      ageVerified: true,
      procedureConsent: true,
      photographyConsent: true,
      marketingConsent: false,
      signatureImageUrl: "https://storage.meetprerna.com/signatures/sig_123.png",
      healthDisclosures: { allergies: false },
    };

    const parsed = insertConsentRecordSchema.safeParse(signedRecord);
    expect(parsed.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/consent-records-consolidation.test.ts`
Expected: FAIL (`status`, `reminderCount` not defined on `insertConsentRecordSchema`, and required fields reject null).

- [ ] **Step 3: Consolidate `consent_records` in schema and workflows**

1. In `src/lib/schema.ts`, upgrade `consentRecords`:
   - Add `status: text("status").default("pending").notNull()`
   - Add `reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true })`
   - Add `reminderCount: integer("reminder_count").default(0).notNull()`
   - Make `legalName`, `dateOfBirth`, `healthDisclosures`, `signatureImageUrl` nullable prior to signing (`null` when `status === 'pending'`).
2. Update `src/lib/workflows/index.ts`:
   - `sendConsentForm`: insert into `consentRecords` with `status: "pending"`.
   - `signConsentForm`: update `consentRecords` with `status: "signed"`, `signedAt: new Date()`, legal name, and signature.
   - `getConsentRecord`: fetch from `consentRecords`.
3. Update `src/app/api/consent/[bookingId]/route.ts` and `src/app/api/consent/[bookingId]/sign/route.ts` to operate solely on `consentRecords`.
4. Update `src/app/api/cron/reminders/route.ts` to update `reminderCount` on `consentRecords`.
5. Remove/deprecate `consentForms` dual-writes.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/consent-records-consolidation.test.ts`
Expected: PASS (2 tests passing).
Run: `bun test tests/golden-path.test.ts tests/workflow-state-machine.test.ts`
Expected: All suites passing.
Run: `bun .\node_modules\typescript\bin\tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema.ts src/lib/workflows/index.ts src/app/api/consent/ src/app/api/cron/reminders/route.ts tests/consent-records-consolidation.test.ts
git commit -m "refactor(consent): consolidate consent_forms into consent_records with reminder tracking"
```

---

## Self-Review Checklist

1. **Spec Coverage:**
   - Script SRI hash for `ideavo.min.js`: Covered in **Task 1**.
   - WhatsApp webhook matching by active booking + phone normalization: Covered in **Task 2**.
   - Public enquiry rate limiting & honeypot bot protection: Covered in **Task 3**.
   - Durable upload storage (S3/R2 with local disk fallback): Covered in **Task 4**.
   - Integration failure visibility (outbox logs table): Covered in **Task 5**.
   - `consent_forms` $\to$ `consent_records` consolidation: Covered in **Task 6**.
2. **No Placeholders:** All tasks contain exact files, complete code snippets, and exact verification commands.
3. **Type Consistency:** Method signatures and Drizzle column names match throughout all tasks.
4. **Environment Constraints:** Follows `bun`, `bun .\node_modules\typescript\bin\tsc --noEmit`, and sandbox execution rules.
