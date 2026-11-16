import { NextResponse } from "next/server";

export function jsonError(error: unknown, fallback = "Action failed") {
  const message = error instanceof Error ? error.message : fallback;
  console.error(error);
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}
