import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import { confirmSessionDate } from "@/lib/workflows";
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
    const result = await confirmSessionDate(
      id,
      { start: new Date(body.start), end: new Date(body.end) },
      user.id
    );
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, eventId: result.eventId });
  } catch (err) {
    return jsonError(err);
  }
}
