import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import { listBookings } from "@/lib/workflows";
import { jsonError } from "@/lib/route-utils";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req.headers);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage") ?? undefined;
    const bookings = await listBookings({ stage });
    return NextResponse.json(bookings);
  } catch (err) {
    return jsonError(err);
  }
}
