import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import { createDepositPaymentLink } from "@/lib/workflows";
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
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 });
    }
    const result = await createDepositPaymentLink(id, amount, user.id);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, paymentId: result.paymentId, linkUrl: result.linkUrl });
  } catch (err) {
    return jsonError(err);
  }
}
