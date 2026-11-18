import { describe, it, expect } from "bun:test";
import { formatIntegrationLog } from "@/lib/services/integration-logger";
import { GET } from "@/app/api/dashboard/integrations/route";
import { NextRequest } from "next/server";

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
    expect(typeof record.id).toBe("string");
    expect(record.createdAt).toBeInstanceOf(Date);
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

  it("should handle non-Error objects and string errors gracefully", () => {
    const record = formatIntegrationLog({
      provider: "calendar",
      action: "calendar.create_event",
      status: "failure",
      error: "Google Calendar service unavailable",
    });

    expect(record.bookingId).toBeNull();
    expect(record.provider).toBe("calendar");
    expect(record.status).toBe("failure");
    expect(record.errorMessage).toBe("Google Calendar service unavailable");
  });

  it("should handle empty payloads and missing error objects", () => {
    const record = formatIntegrationLog({
      bookingId: null,
      provider: "email",
      action: "email.send_confirmation",
      status: "success",
    });

    expect(record.bookingId).toBeNull();
    expect(record.payload).toBeNull();
    expect(record.errorMessage).toBeNull();
  });

  it("should reject unauthenticated requests to the dashboard route with 401", async () => {
    const req = new NextRequest("http://localhost:4000/api/dashboard/integrations");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });
});
