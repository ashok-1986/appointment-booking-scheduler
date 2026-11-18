import { NextRequest, NextResponse } from "next/server";
import { getBooking } from "@/lib/workflows";
import { jsonError, jsonOk } from "@/lib/route-utils";
import { db } from "@/lib/db";
import { clients, consentRecords } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const booking = await getBooking(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Direct fallback lookup for client if not fully populated
    let client: (typeof booking)["client"] | null = booking.client ?? null;
    if (!client && booking.clientId) {
      client =
        (await db.query.clients.findFirst({
          where: eq(clients.id, booking.clientId),
        })) || null;
    }

    // Check for existing consent record in canonical consent_records table
    const existingRecord = await db.query.consentRecords.findFirst({
      where: eq(consentRecords.bookingId, bookingId),
      orderBy: [desc(consentRecords.signedAt)],
    });

    // Map client safely without BigInt fields
    const safeClient = client
      ? {
          id: client.id,
          name: client.name || "",
          email: client.email || "",
          phone: client.phone || "",
          dateOfBirth: client.dateOfBirth || "",
          city: client.city || "",
        }
      : null;

    const existingConsent =
      existingRecord && (existingRecord.status === "signed" || existingRecord.signedAt)
        ? {
            consentRecordId: existingRecord.id,
            status: existingRecord.status,
            legalName: existingRecord.legalName || safeClient?.name || "",
            dateOfBirth: existingRecord.dateOfBirth || safeClient?.dateOfBirth || "",
            signedAt:
              existingRecord.signedAt?.toISOString() ||
              booking.consentSignedAt?.toISOString() ||
              "",
            procedureConsent: existingRecord.procedureConsent ?? true,
            photographyConsent: existingRecord.photographyConsent ?? false,
            marketingConsent: existingRecord.marketingConsent ?? false,
            signatureImageUrl: existingRecord.signatureImageUrl || "",
            idProofType:
              ((existingRecord.healthDisclosures as any)?.idProofType as string) ||
              "Aadhaar Card",
            idProofImageUrl:
              ((existingRecord.healthDisclosures as any)?.idProofImageUrl as string) || "",
            idProofNumber:
              ((existingRecord.healthDisclosures as any)?.idProofNumber as string) || "",
            healthDisclosures: existingRecord.healthDisclosures || {
              allergies: false,
              allergiesDetails: "",
              bloodThinners: false,
              skinConditions: false,
              skinConditionsDetails: "",
              pregnantOrNursing: false,
              cardiacOrEpileptic: false,
            },
          }
        : null;

    return jsonOk({
      ok: true,
      booking: {
        id: booking.id,
        client: safeClient,
        serviceType: booking.serviceType,
        consentSignedAt: booking.consentSignedAt,
      },
      consentRecord: existingRecord ?? null,
      existingConsent,
    });
  } catch (err) {
    return jsonError(err);
  }
}
