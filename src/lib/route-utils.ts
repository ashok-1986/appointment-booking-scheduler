import { NextResponse } from "next/server";

export function serializeBigInts<T>(data: T): T {
  if (data === null || data === undefined) return data;
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(serializeBigInts(data), init);
}

export function jsonError(error: unknown, fallback = "Action failed") {
  const message = error instanceof Error ? error.message : fallback;
  console.error(error);
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}
