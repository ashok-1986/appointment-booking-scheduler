import "dotenv/config";

const BASE_URL = "https://api.hubapi.com/crm/v3";

function getAccessToken(): string {
  const token =
    process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY || "";
  if (!token) {
    throw new Error(
      "HubSpot credentials are not configured. Set HUBSPOT_ACCESS_TOKEN."
    );
  }
  return token;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body as { message?: string; category?: string };
    throw new Error(
      `HubSpot error ${res.status}: ${err?.message || res.statusText}`
    );
  }
  return body as T;
}

export type HubSpotContact = {
  id: string;
  properties: {
    email: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    [key: string]: unknown;
  };
};

export type HubSpotDeal = {
  id: string;
  properties: {
    dealname: string;
    dealstage: string;
    pipeline: string;
    amount?: string;
    hs_deal_stage_probability?: string;
    [key: string]: unknown;
  };
};

/** Map our booking stage -> HubSpot dealstage. Adjust IDs to your pipeline. */
export const HUBSPOT_STAGE_MAP: Record<string, string> = {
  enquiry: "appointmentscheduled",
  in_consultation: "qualifiedtobuy",
  qualified: "decisionmakerboughtin",
  not_a_fit: "closedlost",
  deposit_requested: "contractsent",
  deposit_pending: "contractsent",
  deposit_paid: "closedwon",
  scheduled: "appointmentscheduled",
  session_complete: "closedwon",
  paid_in_full: "closedwon",
  follow_up_sent: "closedwon",
  follow_up_completed: "closedwon",
};

export async function findContactByEmail(
  email: string
): Promise<HubSpotContact | null> {
  try {
    const res = await request<{ results: HubSpotContact[] }>(
      `/objects/contacts/search`,
      {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [
            { filters: [{ propertyName: "email", operator: "EQ", value: email }] },
          ],
          properties: ["email", "firstname", "lastname", "phone"],
        }),
      }
    );
    return res.results[0] ?? null;
  } catch {
    return null;
  }
}

export async function findContactByPhone(
  phone: string
): Promise<HubSpotContact | null> {
  try {
    const res = await request<{ results: HubSpotContact[] }>(
      `/objects/contacts/search`,
      {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [
            { filters: [{ propertyName: "phone", operator: "EQ", value: phone }] },
          ],
          properties: ["email", "firstname", "lastname", "phone"],
        }),
      }
    );
    return res.results[0] ?? null;
  } catch {
    return null;
  }
}

export async function createContact(input: {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  city?: string;
  date_of_birth?: string;
  gender?: string;
  tattoo_timeline?: string;
  instagram_handle?: string;
  message?: string;
  website?: string;
  [key: string]: unknown;
}): Promise<HubSpotContact> {
  return request<HubSpotContact>("/objects/contacts", {
    method: "POST",
    body: JSON.stringify({ properties: input }),
  });
}

export async function createDeal(input: {
  dealname: string;
  amount?: string;
  dealstage: string;
  pipeline?: string;
  contactId?: string;
  properties?: Record<string, unknown>;
}): Promise<HubSpotDeal> {
  const body: Record<string, unknown> = {
    properties: {
      dealname: input.dealname,
      dealstage: input.dealstage,
      pipeline: input.pipeline ?? "default",
      amount: input.amount,
      ...input.properties,
    },
  };
  if (input.contactId) {
    body.associations = [
      {
        to: { id: input.contactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
      },
    ];
  }
  return request<HubSpotDeal>("/objects/deals", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateDealStage(
  dealId: string,
  stage: string,
  extraProperties?: Record<string, unknown>
): Promise<HubSpotDeal> {
  return request<HubSpotDeal>(`/objects/deals/${dealId}`, {
    method: "PATCH",
    body: JSON.stringify({
      properties: {
        dealstage: stage,
        ...extraProperties,
      },
    }),
  });
}

export type TimelineEvent = {
  id: string;
  [key: string]: unknown;
};

/** Add a note to a contact timeline. */
export async function addNote(
  contactId: string,
  body: string,
  metadata?: Record<string, unknown>
): Promise<TimelineEvent> {
  return request<TimelineEvent>(`/objects/contacts/${contactId}/notes`, {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: body,
        ...metadata,
      },
    }),
  });
}

/** Log an email engagement to a contact timeline. */
export async function logEmail(
  contactId: string,
  subject: string,
  body: string
): Promise<TimelineEvent> {
  return request<TimelineEvent>(`/objects/contacts/${contactId}/emails`, {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_timestamp: new Date().toISOString(),
        subject,
        html: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
      },
    }),
  });
}

/** Log a WhatsApp/message engagement to a contact timeline. */
export async function logMessage(
  contactId: string,
  body: string,
  direction: "inbound" | "outbound",
  channel = "whatsapp"
): Promise<TimelineEvent> {
  return request<TimelineEvent>(`/objects/contacts/${contactId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_message_body: `[${direction}] ${body}`,
        hs_message_channel: channel,
      },
    }),
  });
}
