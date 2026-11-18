import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrationLogs } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status");

    const query = db.query.integrationLogs.findMany({
      where: statusFilter ? eq(integrationLogs.status, statusFilter) : undefined,
      orderBy: [desc(integrationLogs.createdAt)],
      limit: 100,
    });

    const logs = await query;
    return NextResponse.json({ ok: true, logs });
  } catch (err: any) {
    console.error("Failed to fetch integration logs:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
