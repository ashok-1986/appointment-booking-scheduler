import { NextRequest, NextResponse } from "next/server";
import { signConsentForm } from "@/lib/workflows";
import { jsonError } from "@/lib/route-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const body = await req.json();
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const ua = req.headers.get("user-agent") ?? "unknown";
    const result = await signConsentForm(
      bookingId,
      {
        healthDisclosure: body.healthDisclosure,
        designApproval: body.designApproval,
        photoPermission: body.photoPermission,
        fullName: body.fullName,
        signature: body.signature,
        signedAt: new Date().toISOString(),
      },
      ip,
      ua
    );
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
