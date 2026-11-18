import { db } from "@/lib/db";
import { integrationLogs } from "@/lib/schema";
import { randomUUID } from "crypto";

export interface LogParams {
  bookingId?: string | null;
  provider: "hubspot" | "calendar" | "whatsapp" | "email" | "razorpay";
  action: string;
  status: "success" | "failure";
  payload?: unknown;
  error?: unknown;
}

export function formatIntegrationLog(params: LogParams) {
  let errorMessage: string | null = null;
  if (params.error) {
    if (params.error instanceof Error) {
      errorMessage = `${params.error.name}: ${params.error.message}`;
    } else {
      errorMessage = String(params.error);
    }
  }

  return {
    id: randomUUID(),
    bookingId: params.bookingId ?? null,
    provider: params.provider,
    action: params.action,
    status: params.status,
    payload: (params.payload as Record<string, unknown>) ?? null,
    errorMessage,
    createdAt: new Date(),
  };
}

export async function recordIntegrationLog(params: LogParams): Promise<void> {
  try {
    const formatted = formatIntegrationLog(params);
    await db.insert(integrationLogs).values(formatted);
  } catch (err) {
    console.error("Failed to persist integration log:", err);
  }
}
