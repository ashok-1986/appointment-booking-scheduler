import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import { proposeSessionDates } from "@/lib/workflows";
import { jsonError } from "@/lib/route-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const slots = (body.slots ?? []).map((s: { start: string; end: string }) => ({
      start: new Date(s.start),
      end: new Date(s.end),
    }));
    if (slots.length === 0) {
      return NextResponse.json({ ok: false, error: "No slots provided" }, { status: 400 });
    }
    const result = await proposeSessionDates(id, slots, user.id);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, slots: result.slots });
  } catch (err) {
    return jsonError(err);
  }
}
