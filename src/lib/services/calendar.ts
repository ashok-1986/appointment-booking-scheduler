import "dotenv/config";

const CALENDAR_URL = "https://www.googleapis.com/calendar/v3";

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN!;
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Calendar credentials are not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN."
    );
  }
  return { clientId, clientSecret, refreshToken, calendarId };
}

let cachedToken: { access_token: string; expiry: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiry > Date.now() + 60_000) {
    return cachedToken.access_token;
  }
  const { clientId, clientSecret, refreshToken } = getConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
  cachedToken = {
    access_token: body.access_token,
    expiry: Date.now() + body.expires_in * 1000,
  };
  return cachedToken.access_token;
}

export type TimeRange = { start: Date; end: Date };

export type BusySlot = { start: string; end: string };

/** Query freebusy to determine if the artist is available in the given range. */
export async function getBusySlots(
  range: TimeRange
): Promise<BusySlot[]> {
  const token = await getAccessToken();
  const { calendarId } = getConfig();
  const res = await fetch(`${CALENDAR_URL}/freeBusy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      timeMin: range.start.toISOString(),
      timeMax: range.end.toISOString(),
      items: [{ id: calendarId }],
    }),
  });
  const body = (await res.json()) as {
    calendars: Record<string, { busy: BusySlot[] }>;
  };
  if (!res.ok) throw new Error(`Google freeBusy failed: ${res.status}`);
  return body.calendars[calendarId]?.busy ?? [];
}

export async function isSlotAvailable(
  start: Date,
  end: Date
): Promise<boolean> {
  const busy = await getBusySlots({ start, end });
  return busy.length === 0;
}

/** Generate candidate slots within a range honoring the artist's working hours. */
export function generateSlots(
  range: TimeRange,
  workingHours: { start: string; end: string },
  durationMinutes: number
): TimeRange[] {
  const slots: TimeRange[] = [];
  const [startH, startM] = workingHours.start.split(":").map(Number);
  const [endH, endM] = workingHours.end.split(":").map(Number);
  const dayStart = range.start;
  const dayEnd = range.end;
  for (let d = new Date(dayStart); d <= dayEnd; d.setDate(d.getDate() + 1)) {
    const open = new Date(d);
    open.setHours(startH, startM, 0, 0);
    const close = new Date(d);
    close.setHours(endH, endM, 0, 0);
    for (let t = new Date(open); t < close; t.setMinutes(t.getMinutes() + durationMinutes)) {
      const slotEnd = new Date(t.getTime() + durationMinutes * 60_000);
      if (slotEnd <= close) {
        slots.push({ start: new Date(t), end: slotEnd });
      }
    }
  }
  return slots;
}

export type CreateEventInput = {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendeeEmail?: string;
  location?: string;
};

export type CreatedEvent = {
  id: string;
  htmlLink: string;
  hangoutLink?: string;
};

/** Create a calendar event and return the invite link. */
export async function createSessionEvent(
  input: CreateEventInput
): Promise<CreatedEvent> {
  const token = await getAccessToken();
  const { calendarId } = getConfig();
  const res = await fetch(`${CALENDAR_URL}/calendars/${calendarId}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: { dateTime: input.start.toISOString() },
      end: { dateTime: input.end.toISOString() },
      attendees: input.attendeeEmail ? [{ email: input.attendeeEmail }] : [],
    }),
  });
  const body = (await res.json()) as { id?: string; htmlLink?: string };
  if (!res.ok) throw new Error(`Google createEvent failed: ${res.status}`);
  return { id: body.id!, htmlLink: body.htmlLink! };
}

/** Delete a calendar event (used on reschedule/cancel). */
export async function deleteEvent(eventId: string): Promise<void> {
  const token = await getAccessToken();
  const { calendarId } = getConfig();
  await fetch(`${CALENDAR_URL}/calendars/${calendarId}/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
