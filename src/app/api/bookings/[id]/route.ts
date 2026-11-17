import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import { getBooking } from "@/lib/workflows";
import { jsonOk, jsonError } from "@/lib/route-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const booking = await getBooking(id);
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return jsonOk(booking);
  } catch (err) {
    return jsonError(err);
  }
}
