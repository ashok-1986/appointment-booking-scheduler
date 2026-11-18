export type ViewMode = "month" | "week" | "day" | "agenda";

export type SessionItem = {
  id: string;
  bookingId: string;
  sessionNumber: number;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "rescheduled" | string;
  notes: string | null;
  consentStatus: "not_started" | "sent" | "signed" | "overridden" | string;
  overrideReason?: string | null;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    instagramHandle: string | null;
  };
  booking: {
    id: string;
    serviceType: string;
    designDescription: string | null;
    placement: string | null;
    approximateSize: string | null;
    quotedAmount: string | null;
    stage: string;
  };
};

export type ClientOption = {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagramHandle: string | null;
};

export const DURATION_PRESETS = [
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "3 hours (Standard)", value: 180 },
  { label: "4 hours (Half Day)", value: 240 },
  { label: "6 hours (Full Day)", value: 360 },
];

export const TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

export const SERVICE_TYPES = [
  "Tattoo",
  "Cover Up",
  "Touch-up",
  "Commission Artwork",
  "Consultation",
];
