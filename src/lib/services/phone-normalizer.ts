export interface PhoneVariants {
  e164: string;
  national: string;
  rawDigits: string;
  queryVariants: string[];
}

export function normalizePhoneNumber(raw: string): PhoneVariants {
  const digits = raw.replace(/\D/g, "");
  let national = digits;
  if (digits.length === 12 && digits.startsWith("91")) {
    national = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    national = digits.slice(1);
  }

  const e164 = digits ? (digits.startsWith("+") ? digits : `+${digits}`) : "";
  const queryVariants = Array.from(
    new Set([
      raw.trim(),
      digits,
      e164,
      national,
      national ? `+91${national}` : "",
      national ? `91${national}` : "",
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

  const active = sorted.find((b) => !terminalStages.includes(b.stage));
  if (active) return active;

  return sorted[0];
}
