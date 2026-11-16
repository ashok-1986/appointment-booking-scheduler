import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import { listPayments } from "@/lib/workflows";
import { jsonError } from "@/lib/route-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payments = await listPayments(id);
    return NextResponse.json(payments);
  } catch (err) {
    return jsonError(err);
  }
}
