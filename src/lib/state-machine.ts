/**
 * Booking state machine definitions and transition rules for Meet Prerna studio scheduler.
 */

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
