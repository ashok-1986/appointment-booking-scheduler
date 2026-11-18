/**
 * Booking state machine definitions and transition rules for Meet Prerna studio scheduler.
 */

// ==========================================
// V1 7-Stage Compact Booking Lifecycle Specification
// ==========================================

export const V1_PIPELINE_STAGES = [
  "new_enquiry",
  "consultation_review",
  "deposit_pending",
  "confirmed_scheduled",
  "session_completed",
  "payment_pending",
  "closed_followup",
] as const;

export type V1PipelineStage = (typeof V1_PIPELINE_STAGES)[number];

export const V1_STAGE_LABELS: Record<V1PipelineStage, string> = {
  new_enquiry: "New Enquiry",
  consultation_review: "Consultation & Review",
  deposit_pending: "Deposit Pending",
  confirmed_scheduled: "Confirmed / Scheduled",
  session_completed: "Session Completed",
  payment_pending: "Payment Pending",
  closed_followup: "Closed / Follow-up",
};

export const V1_STAGE_DESCRIPTIONS: Record<V1PipelineStage, string> = {
  new_enquiry: "Intake form received, customer profile created",
  consultation_review: "Artist reviewing idea, placement, size & budget",
  deposit_pending: "Quote and deposit request link dispatched",
  confirmed_scheduled: "Deposit verified, appointment placed on calendar",
  session_completed: "Digital consent verified, tattoo completed & photos captured",
  payment_pending: "Remaining balance requested & tracking",
  closed_followup: "Payment settled, aftercare delivered & healed photo scheduled",
};

export const V1_ALL_STAGES = [
  ...V1_PIPELINE_STAGES,
  "not_a_fit",
  "cancelled",
] as const;

export type V1BookingStage = (typeof V1_ALL_STAGES)[number];

export const V1_STAGE_TRANSITIONS: Record<V1BookingStage, readonly V1BookingStage[]> = {
  new_enquiry: ["consultation_review", "deposit_pending", "not_a_fit"],
  consultation_review: ["deposit_pending", "not_a_fit"],
  deposit_pending: ["confirmed_scheduled", "not_a_fit"],
  confirmed_scheduled: ["session_completed", "cancelled"],
  session_completed: ["payment_pending"],
  payment_pending: ["closed_followup"],
  closed_followup: [],
  not_a_fit: [],
  cancelled: [],
};

/**
 * Normalizes legacy stage names to canonical V1 7-stage pipeline names.
 */
export function normalizeToV1Stage(stage: string): V1BookingStage {
  if (V1_ALL_STAGES.includes(stage as any)) {
    return stage as V1BookingStage;
  }

  switch (stage) {
    case "enquiry":
    case "enquiry_received":
      return "new_enquiry";
    case "in_consultation":
    case "consultation_scheduled":
    case "consultation_completed":
    case "qualified":
      return "consultation_review";
    case "deposit_requested":
    case "deposit_pending":
    case "link_expired":
      return "deposit_pending";
    case "deposit_paid":
    case "scheduled":
    case "session_scheduled":
    case "session_rescheduled":
    case "consent_sent":
    case "consent_signed":
      return "confirmed_scheduled";
    case "session_complete":
    case "session_completed":
      return "session_completed";
    case "balance_requested":
    case "paid_in_full":
    case "balance_paid":
    case "payment_pending":
      return "payment_pending";
    case "follow_up_sent":
    case "follow_up_completed":
    case "completed":
    case "aftercare_sent":
    case "healed_photos_requested":
    case "closed_followup":
      return "closed_followup";
    case "not_a_fit":
      return "not_a_fit";
    case "cancelled":
    case "session_cancelled":
    case "consultation_cancelled":
      return "cancelled";
    default:
      return "new_enquiry";
  }
}

export function canTransitionV1(
  from: V1BookingStage | string,
  to: V1BookingStage | string
): boolean {
  const normFrom = normalizeToV1Stage(from);
  const normTo = normalizeToV1Stage(to);
  const allowed = V1_STAGE_TRANSITIONS[normFrom];
  if (!allowed) return false;
  return allowed.includes(normTo);
}

export function getNextAllowedStagesV1(
  current: V1BookingStage | string
): readonly V1BookingStage[] {
  const norm = normalizeToV1Stage(current);
  return V1_STAGE_TRANSITIONS[norm] ?? [];
}

// ==========================================
// Legacy Compatibility Stages & Transitions
// ==========================================

export const BOOKING_STAGES = [
  "enquiry_received",
  "consultation_scheduled",
  "consultation_completed",
  "consultation_cancelled",
  "qualified",
  "not_a_fit",
  "deposit_requested",
  "deposit_paid",
  "link_expired",
  "session_scheduled",
  "session_rescheduled",
  "session_cancelled",
  "consent_sent",
  "consent_signed",
  "balance_requested",
  "balance_paid",
  "session_completed",
  "aftercare_sent",
  "healed_photos_requested",
  "completed",
] as const;

export type BookingStage = (typeof BOOKING_STAGES)[number];

export const PIPELINE_STAGES: readonly BookingStage[] = [
  "enquiry_received",
  "consultation_scheduled",
  "consultation_completed",
  "qualified",
  "deposit_requested",
  "deposit_paid",
  "session_scheduled",
  "consent_sent",
  "consent_signed",
  "balance_requested",
  "balance_paid",
  "session_completed",
  "aftercare_sent",
  "healed_photos_requested",
  "completed",
] as const;

/**
 * Valid transitions map between stages.
 */
export const STAGE_TRANSITIONS: Record<BookingStage, readonly BookingStage[]> = {
  enquiry_received: ["consultation_scheduled", "not_a_fit", "qualified"],
  consultation_scheduled: ["consultation_completed", "consultation_cancelled"],
  consultation_completed: ["qualified", "not_a_fit"],
  qualified: ["deposit_requested", "not_a_fit"],
  deposit_requested: ["deposit_paid", "link_expired"],
  deposit_paid: ["session_scheduled"],
  session_scheduled: ["consent_sent", "session_rescheduled", "session_cancelled"],
  session_rescheduled: ["session_scheduled", "session_cancelled"],
  session_cancelled: [],
  consultation_cancelled: [],
  link_expired: ["deposit_requested", "not_a_fit"],
  consent_sent: ["consent_signed"],
  consent_signed: ["balance_requested"],
  balance_requested: ["balance_paid"],
  balance_paid: ["session_completed"],
  session_completed: ["aftercare_sent"],
  aftercare_sent: ["healed_photos_requested"],
  healed_photos_requested: ["completed"],
  completed: [],
  not_a_fit: [],
};

/**
 * Check if transitioning from one stage to another is valid.
 */
export function canTransition(
  from: BookingStage | string,
  to: BookingStage | string
): boolean {
  const allowed = STAGE_TRANSITIONS[from as BookingStage];
  if (!allowed) return false;
  return allowed.includes(to as BookingStage);
}

/**
 * Returns list of allowed next stages from the current stage.
 * Terminal stages return an empty array.
 */
export function getNextAllowedStages(
  current: BookingStage | string
): readonly BookingStage[] {
  return STAGE_TRANSITIONS[current as BookingStage] ?? [];
}

export type TransitionValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Validates a transition and returns structured result with error message if invalid.
 */
export function validateTransition(
  from: BookingStage | string,
  to: BookingStage | string
): TransitionValidationResult {
  const allowed = canTransition(from, to);
  if (!allowed) {
    return {
      valid: false,
      error: `Invalid transition from '${from}' to '${to}'`,
    };
  }
  return { valid: true };
}
