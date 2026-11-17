import { describe, it, expect } from "bun:test";
import {
  canTransition,
  getNextAllowedStages,
  validateTransition,
  BOOKING_STAGES,
  PIPELINE_STAGES,
  type BookingStage,
} from "@/lib/state-machine";

describe("State Machine - Meet Prerna Booking Workflow", () => {
  describe("Definitions & Constants", () => {
    it("should define BOOKING_STAGES as an array containing all expected booking stages", () => {
      expect(Array.isArray(BOOKING_STAGES)).toBe(true);
      expect(BOOKING_STAGES).toContain("enquiry_received");
      expect(BOOKING_STAGES).toContain("consultation_scheduled");
      expect(BOOKING_STAGES).toContain("consultation_completed");
      expect(BOOKING_STAGES).toContain("consultation_cancelled");
      expect(BOOKING_STAGES).toContain("qualified");
      expect(BOOKING_STAGES).toContain("not_a_fit");
      expect(BOOKING_STAGES).toContain("deposit_requested");
      expect(BOOKING_STAGES).toContain("deposit_paid");
      expect(BOOKING_STAGES).toContain("link_expired");
      expect(BOOKING_STAGES).toContain("session_scheduled");
      expect(BOOKING_STAGES).toContain("session_rescheduled");
      expect(BOOKING_STAGES).toContain("session_cancelled");
      expect(BOOKING_STAGES).toContain("consent_sent");
      expect(BOOKING_STAGES).toContain("consent_signed");
      expect(BOOKING_STAGES).toContain("balance_requested");
      expect(BOOKING_STAGES).toContain("balance_paid");
      expect(BOOKING_STAGES).toContain("session_completed");
      expect(BOOKING_STAGES).toContain("aftercare_sent");
      expect(BOOKING_STAGES).toContain("healed_photos_requested");
      expect(BOOKING_STAGES).toContain("completed");
    });

    it("should define PIPELINE_STAGES as the main sequential progression stages", () => {
      expect(Array.isArray(PIPELINE_STAGES)).toBe(true);
      expect(PIPELINE_STAGES).toContain("enquiry_received");
      expect(PIPELINE_STAGES).toContain("consultation_scheduled");
      expect(PIPELINE_STAGES).toContain("consultation_completed");
      expect(PIPELINE_STAGES).toContain("qualified");
      expect(PIPELINE_STAGES).toContain("deposit_requested");
      expect(PIPELINE_STAGES).toContain("deposit_paid");
      expect(PIPELINE_STAGES).toContain("session_scheduled");
      expect(PIPELINE_STAGES).toContain("consent_sent");
      expect(PIPELINE_STAGES).toContain("consent_signed");
      expect(PIPELINE_STAGES).toContain("balance_requested");
      expect(PIPELINE_STAGES).toContain("balance_paid");
      expect(PIPELINE_STAGES).toContain("session_completed");
      expect(PIPELINE_STAGES).toContain("aftercare_sent");
      expect(PIPELINE_STAGES).toContain("healed_photos_requested");
      expect(PIPELINE_STAGES).toContain("completed");
    });
  });

  describe("Valid Forward Transitions", () => {
    it("should allow transitions from enquiry_received to consultation_scheduled, not_a_fit, qualified", () => {
      expect(canTransition("enquiry_received", "consultation_scheduled")).toBe(true);
      expect(canTransition("enquiry_received", "not_a_fit")).toBe(true);
      expect(canTransition("enquiry_received", "qualified")).toBe(true);

      expect(validateTransition("enquiry_received", "consultation_scheduled").valid).toBe(true);
      expect(validateTransition("enquiry_received", "not_a_fit").valid).toBe(true);
      expect(validateTransition("enquiry_received", "qualified").valid).toBe(true);

      const next = getNextAllowedStages("enquiry_received");
      expect(next).toEqual(["consultation_scheduled", "not_a_fit", "qualified"]);
    });

    it("should allow transitions from consultation_scheduled to consultation_completed, consultation_cancelled", () => {
      expect(canTransition("consultation_scheduled", "consultation_completed")).toBe(true);
      expect(canTransition("consultation_scheduled", "consultation_cancelled")).toBe(true);

      expect(validateTransition("consultation_scheduled", "consultation_completed").valid).toBe(true);
      expect(validateTransition("consultation_scheduled", "consultation_cancelled").valid).toBe(true);

      const next = getNextAllowedStages("consultation_scheduled");
      expect(next).toEqual(["consultation_completed", "consultation_cancelled"]);
    });

    it("should allow transitions from consultation_completed to qualified, not_a_fit", () => {
      expect(canTransition("consultation_completed", "qualified")).toBe(true);
      expect(canTransition("consultation_completed", "not_a_fit")).toBe(true);

      expect(validateTransition("consultation_completed", "qualified").valid).toBe(true);
      expect(validateTransition("consultation_completed", "not_a_fit").valid).toBe(true);

      const next = getNextAllowedStages("consultation_completed");
      expect(next).toEqual(["qualified", "not_a_fit"]);
    });

    it("should allow transitions from qualified to deposit_requested, not_a_fit", () => {
      expect(canTransition("qualified", "deposit_requested")).toBe(true);
      expect(canTransition("qualified", "not_a_fit")).toBe(true);

      expect(validateTransition("qualified", "deposit_requested").valid).toBe(true);
      expect(validateTransition("qualified", "not_a_fit").valid).toBe(true);

      const next = getNextAllowedStages("qualified");
      expect(next).toEqual(["deposit_requested", "not_a_fit"]);
    });

    it("should allow transitions from deposit_requested to deposit_paid, link_expired", () => {
      expect(canTransition("deposit_requested", "deposit_paid")).toBe(true);
      expect(canTransition("deposit_requested", "link_expired")).toBe(true);

      expect(validateTransition("deposit_requested", "deposit_paid").valid).toBe(true);
      expect(validateTransition("deposit_requested", "link_expired").valid).toBe(true);

      const next = getNextAllowedStages("deposit_requested");
      expect(next).toEqual(["deposit_paid", "link_expired"]);
    });

    it("should allow transitions from deposit_paid to session_scheduled", () => {
      expect(canTransition("deposit_paid", "session_scheduled")).toBe(true);
      expect(validateTransition("deposit_paid", "session_scheduled").valid).toBe(true);

      const next = getNextAllowedStages("deposit_paid");
      expect(next).toEqual(["session_scheduled"]);
    });

    it("should allow transitions from session_scheduled to consent_sent, session_rescheduled, session_cancelled", () => {
      expect(canTransition("session_scheduled", "consent_sent")).toBe(true);
      expect(canTransition("session_scheduled", "session_rescheduled")).toBe(true);
      expect(canTransition("session_scheduled", "session_cancelled")).toBe(true);

      expect(validateTransition("session_scheduled", "consent_sent").valid).toBe(true);
      expect(validateTransition("session_scheduled", "session_rescheduled").valid).toBe(true);
      expect(validateTransition("session_scheduled", "session_cancelled").valid).toBe(true);

      const next = getNextAllowedStages("session_scheduled");
      expect(next).toEqual(["consent_sent", "session_rescheduled", "session_cancelled"]);
    });

    it("should allow transitions from consent_sent to consent_signed", () => {
      expect(canTransition("consent_sent", "consent_signed")).toBe(true);
      expect(validateTransition("consent_sent", "consent_signed").valid).toBe(true);

      const next = getNextAllowedStages("consent_sent");
      expect(next).toEqual(["consent_signed"]);
    });

    it("should allow transitions from consent_signed to balance_requested", () => {
      expect(canTransition("consent_signed", "balance_requested")).toBe(true);
      expect(validateTransition("consent_signed", "balance_requested").valid).toBe(true);

      const next = getNextAllowedStages("consent_signed");
      expect(next).toEqual(["balance_requested"]);
    });

    it("should allow transitions from balance_requested to balance_paid", () => {
      expect(canTransition("balance_requested", "balance_paid")).toBe(true);
      expect(validateTransition("balance_requested", "balance_paid").valid).toBe(true);

      const next = getNextAllowedStages("balance_requested");
      expect(next).toEqual(["balance_paid"]);
    });

    it("should allow transitions from balance_paid to session_completed", () => {
      expect(canTransition("balance_paid", "session_completed")).toBe(true);
      expect(validateTransition("balance_paid", "session_completed").valid).toBe(true);

      const next = getNextAllowedStages("balance_paid");
      expect(next).toEqual(["session_completed"]);
    });

    it("should allow transitions from session_completed to aftercare_sent", () => {
      expect(canTransition("session_completed", "aftercare_sent")).toBe(true);
      expect(validateTransition("session_completed", "aftercare_sent").valid).toBe(true);

      const next = getNextAllowedStages("session_completed");
      expect(next).toEqual(["aftercare_sent"]);
    });

    it("should allow transitions from aftercare_sent to healed_photos_requested", () => {
      expect(canTransition("aftercare_sent", "healed_photos_requested")).toBe(true);
      expect(validateTransition("aftercare_sent", "healed_photos_requested").valid).toBe(true);

      const next = getNextAllowedStages("aftercare_sent");
      expect(next).toEqual(["healed_photos_requested"]);
    });

    it("should allow transitions from healed_photos_requested to completed", () => {
      expect(canTransition("healed_photos_requested", "completed")).toBe(true);
      expect(validateTransition("healed_photos_requested", "completed").valid).toBe(true);

      const next = getNextAllowedStages("healed_photos_requested");
      expect(next).toEqual(["completed"]);
    });
  });

  describe("Invalid Transitions & Skipping Safeguards", () => {
    it("should block enquiry_received from skipping directly to completed or session_completed", () => {
      expect(canTransition("enquiry_received", "completed")).toBe(false);
      expect(canTransition("enquiry_received", "session_completed")).toBe(false);
      expect(canTransition("enquiry_received", "deposit_paid")).toBe(false);

      const valCompleted = validateTransition("enquiry_received", "completed");
      expect(valCompleted.valid).toBe(false);
      expect(valCompleted.error).toBeDefined();

      const valSessionCompleted = validateTransition("enquiry_received", "session_completed");
      expect(valSessionCompleted.valid).toBe(false);
      expect(valSessionCompleted.error).toBeDefined();
    });

    it("should block skipping steps across the pipeline", () => {
      expect(canTransition("deposit_requested", "session_scheduled")).toBe(false);
      expect(canTransition("consultation_scheduled", "deposit_requested")).toBe(false);
      expect(canTransition("session_scheduled", "session_completed")).toBe(false);
      expect(canTransition("consent_sent", "balance_paid")).toBe(false);
    });

    it("should block backwards transitions unless explicitly defined", () => {
      expect(canTransition("session_completed", "session_scheduled")).toBe(false);
      expect(canTransition("deposit_paid", "enquiry_received")).toBe(false);
      expect(canTransition("completed", "aftercare_sent")).toBe(false);
    });

    it("should reject transitions from or to unknown stages", () => {
      expect(canTransition("unknown_stage" as BookingStage, "enquiry_received")).toBe(false);
      expect(canTransition("enquiry_received", "unknown_stage" as BookingStage)).toBe(false);

      const res = validateTransition("unknown_stage", "completed");
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe("Terminal Stages", () => {
    it("should treat completed as a terminal stage with no next allowed stages", () => {
      const allowed = getNextAllowedStages("completed");
      expect(allowed).toEqual([]);
      expect(allowed.length).toBe(0);

      BOOKING_STAGES.forEach((targetStage) => {
        expect(canTransition("completed", targetStage)).toBe(false);
      });
    });

    it("should treat not_a_fit as a terminal stage with no next allowed stages", () => {
      const allowed = getNextAllowedStages("not_a_fit");
      expect(allowed).toEqual([]);
      expect(allowed.length).toBe(0);

      BOOKING_STAGES.forEach((targetStage) => {
        expect(canTransition("not_a_fit", targetStage)).toBe(false);
      });
    });

    it("should return invalid validation result when attempting to transition out of terminal stages", () => {
      const completedRes = validateTransition("completed", "enquiry_received");
      expect(completedRes.valid).toBe(false);
      expect(completedRes.error).toContain("Invalid transition");

      const notAFitRes = validateTransition("not_a_fit", "qualified");
      expect(notAFitRes.valid).toBe(false);
      expect(notAFitRes.error).toContain("Invalid transition");
    });
  });
});
