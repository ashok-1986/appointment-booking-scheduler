import { describe, expect, it } from "bun:test";
import {
  V1_PIPELINE_STAGES,
  V1_ALL_STAGES,
  V1_STAGE_TRANSITIONS,
  canTransitionV1,
  getNextAllowedStagesV1,
  normalizeToV1Stage,
} from "@/lib/state-machine";

describe("State Machine V1 - 7-Stage Tattoo Lifecycle", () => {
  it("should define exactly 7 primary pipeline stages", () => {
    expect(V1_PIPELINE_STAGES).toEqual([
      "new_enquiry",
      "consultation_review",
      "deposit_pending",
      "confirmed_scheduled",
      "session_completed",
      "payment_pending",
      "closed_followup",
    ]);
  });

  it("should normalize legacy stage names to V1 canonical stages", () => {
    expect(normalizeToV1Stage("enquiry")).toBe("new_enquiry");
    expect(normalizeToV1Stage("in_consultation")).toBe("consultation_review");
    expect(normalizeToV1Stage("deposit_requested")).toBe("deposit_pending");
    expect(normalizeToV1Stage("scheduled")).toBe("confirmed_scheduled");
    expect(normalizeToV1Stage("session_complete")).toBe("session_completed");
    expect(normalizeToV1Stage("paid_in_full")).toBe("payment_pending");
    expect(normalizeToV1Stage("follow_up_completed")).toBe("closed_followup");
    expect(normalizeToV1Stage("not_a_fit")).toBe("not_a_fit");
  });

  it("should allow valid forward progression through the 7 stages", () => {
    expect(canTransitionV1("new_enquiry", "consultation_review")).toBe(true);
    expect(canTransitionV1("consultation_review", "deposit_pending")).toBe(true);
    expect(canTransitionV1("deposit_pending", "confirmed_scheduled")).toBe(true);
    expect(canTransitionV1("confirmed_scheduled", "session_completed")).toBe(true);
    expect(canTransitionV1("session_completed", "payment_pending")).toBe(true);
    expect(canTransitionV1("payment_pending", "closed_followup")).toBe(true);
  });

  it("should allow rejection or cancellation from relevant stages", () => {
    expect(canTransitionV1("new_enquiry", "not_a_fit")).toBe(true);
    expect(canTransitionV1("consultation_review", "not_a_fit")).toBe(true);
    expect(canTransitionV1("deposit_pending", "not_a_fit")).toBe(true);
    expect(canTransitionV1("confirmed_scheduled", "cancelled")).toBe(true);
  });

  it("should block invalid stage skipping", () => {
    expect(canTransitionV1("new_enquiry", "confirmed_scheduled")).toBe(false);
    expect(canTransitionV1("new_enquiry", "session_completed")).toBe(false);
    expect(canTransitionV1("deposit_pending", "closed_followup")).toBe(false);
  });

  it("should treat closed_followup and not_a_fit as terminal", () => {
    expect(getNextAllowedStagesV1("closed_followup")).toEqual([]);
    expect(getNextAllowedStagesV1("not_a_fit")).toEqual([]);
    expect(canTransitionV1("closed_followup", "new_enquiry")).toBe(false);
  });
});
