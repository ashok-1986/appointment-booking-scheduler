import { describe, it, expect } from "bun:test";
import {
  canTransitionV1,
  normalizeToV1Stage,
  getNextAllowedStagesV1,
  V1_STAGE_TRANSITIONS,
} from "@/lib/state-machine";
import { DURATION_PRESETS, TIME_SLOTS, SERVICE_TYPES } from "@/components/dashboard/calendar/types";
import { StatusBadge, ConsentBadge } from "@/components/dashboard/calendar/status-badges";
import { AppointmentModal } from "@/components/dashboard/calendar/appointment-modal";
import { SessionDetailsModal } from "@/components/dashboard/calendar/session-details-modal";
import { WhatsAppConfirmationModal } from "@/components/dashboard/calendar/whatsapp-modal";

describe("Workflow State Machine & Architecture Verification Suite", () => {
  describe("1. V1 State Machine Transition Rules", () => {
    it("should allow direct qualification from new_enquiry to deposit_pending", () => {
      expect(canTransitionV1("new_enquiry", "deposit_pending")).toBe(true);
      expect(canTransitionV1("enquiry", "deposit_requested")).toBe(true);
    });

    it("should enforce sequential forward progression across all 7 stages", () => {
      expect(canTransitionV1("new_enquiry", "consultation_review")).toBe(true);
      expect(canTransitionV1("consultation_review", "deposit_pending")).toBe(true);
      expect(canTransitionV1("deposit_pending", "confirmed_scheduled")).toBe(true);
      expect(canTransitionV1("confirmed_scheduled", "session_completed")).toBe(true);
      expect(canTransitionV1("session_completed", "payment_pending")).toBe(true);
      expect(canTransitionV1("payment_pending", "closed_followup")).toBe(true);
    });

    it("should block illegal lifecycle regressions", () => {
      // Cannot regress from completed session to deposit or consultation
      expect(canTransitionV1("session_completed", "deposit_pending")).toBe(false);
      expect(canTransitionV1("session_completed", "consultation_review")).toBe(false);
      expect(canTransitionV1("session_completed", "new_enquiry")).toBe(false);

      // Cannot regress from closed_followup to any stage
      expect(canTransitionV1("closed_followup", "session_completed")).toBe(false);
      expect(canTransitionV1("closed_followup", "new_enquiry")).toBe(false);

      // Cannot regress from payment_pending to consultation
      expect(canTransitionV1("payment_pending", "consultation_review")).toBe(false);
    });

    it("should block illegal skipping", () => {
      expect(canTransitionV1("new_enquiry", "confirmed_scheduled")).toBe(false);
      expect(canTransitionV1("new_enquiry", "session_completed")).toBe(false);
      expect(canTransitionV1("new_enquiry", "payment_pending")).toBe(false);
      expect(canTransitionV1("new_enquiry", "closed_followup")).toBe(false);
      expect(canTransitionV1("deposit_pending", "closed_followup")).toBe(false);
    });

    it("should maintain terminal stages correctly", () => {
      expect(getNextAllowedStagesV1("closed_followup")).toEqual([]);
      expect(getNextAllowedStagesV1("not_a_fit")).toEqual([]);
      expect(getNextAllowedStagesV1("cancelled")).toEqual([]);
    });
  });

  describe("2. Calendar Subcomponents Decomposition", () => {
    it("should export presets and constants correctly from calendar/types", () => {
      expect(Array.isArray(DURATION_PRESETS)).toBe(true);
      expect(DURATION_PRESETS.length).toBeGreaterThan(0);
      expect(Array.isArray(TIME_SLOTS)).toBe(true);
      expect(TIME_SLOTS.length).toBeGreaterThan(0);
      expect(Array.isArray(SERVICE_TYPES)).toBe(true);
      expect(SERVICE_TYPES).toContain("Tattoo");
      expect(SERVICE_TYPES).toContain("Consultation");
    });

    it("should export modular UI components", () => {
      expect(typeof StatusBadge).toBe("function");
      expect(typeof ConsentBadge).toBe("function");
      expect(typeof AppointmentModal).toBe("function");
      expect(typeof SessionDetailsModal).toBe("function");
      expect(typeof WhatsAppConfirmationModal).toBe("function");
    });
  });
});
