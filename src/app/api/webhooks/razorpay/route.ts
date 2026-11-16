import { NextRequest, NextResponse } from "next/server";
import { handleRazorpayWebhook } from "@/lib/workflows";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("X-Razorpay-Signature") ?? "";
    const rawBody = await req.text();
    const result = await handleRazorpayWebhook(rawBody, signature);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Razorpay webhook error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Webhook error" },
      { status: 500 }
    );
  }
}
