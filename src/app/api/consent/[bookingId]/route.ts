import { NextRequest, NextResponse } from "next/server";
import { getBooking } from "@/lib/workflows";
import { jsonError, jsonOk } from "@/lib/route-utils";
import { db } from "@/lib/db";
import { clients, consentForms, consentRecords } from "@/lib/schema";
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

    // Check for existing signed consent record or form
    const [existingRecord, existingForm] = await Promise.all([
      db.query.consentRecords.findFirst({
        where: eq(consentRecords.bookingId, bookingId),
        orderBy: [desc(consentRecords.signedAt)],
      }),
      db.query.consentForms.findFirst({
        where: eq(consentForms.bookingId, bookingId),
      }),
    ]);

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

    const signedPayload =
      (existingForm?.signedData as Record<string, any> | null) ||
      (existingForm?.formData as Record<string, any> | null) ||
      null;

    const existingConsent =
      existingRecord || existingForm
        ? {
            consentRecordId: existingRecord?.id || existingForm?.id,
            legalName:
              existingRecord?.legalName ||
              (signedPayload?.legalName as string) ||
              (signedPayload?.fullName as string) ||
              safeClient?.name ||
              "",
            dateOfBirth:
              existingRecord?.dateOfBirth ||
              (signedPayload?.dateOfBirth as string) ||
              safeClient?.dateOfBirth ||
              "",
            signedAt:
              existingRecord?.signedAt?.toISOString() ||
              existingForm?.signedAt?.toISOString() ||
              booking.consentSignedAt?.toISOString() ||
              "",
            procedureConsent:
              existingRecord?.procedureConsent ??
              (signedPayload?.procedureConsent as boolean) ??
              true,
            photographyConsent:
              existingRecord?.photographyConsent ??
              (signedPayload?.photographyConsent as boolean) ??
              (signedPayload?.photoPermission as boolean) ??
              false,
            marketingConsent:
              existingRecord?.marketingConsent ??
              (signedPayload?.marketingConsent as boolean) ??
              false,
            signatureImageUrl:
              existingRecord?.signatureImageUrl ||
              (signedPayload?.signatureImageUrl as string) ||
              (signedPayload?.signature as string) ||
              "",
            idProofType:
              (signedPayload?.idProofType as string) ||
              ((existingRecord?.healthDisclosures as any)?.idProofType as string) ||
              "Aadhaar Card",
            idProofImageUrl:
              (signedPayload?.idProofImageUrl as string) ||
              ((existingRecord?.healthDisclosures as any)?.idProofImageUrl as string) ||
              "",
            idProofNumber:
              (signedPayload?.idProofNumber as string) ||
              ((existingRecord?.healthDisclosures as any)?.idProofNumber as string) ||
              "",
            healthDisclosures:
              existingRecord?.healthDisclosures ||
              signedPayload?.healthDisclosures || {
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
      existingConsent,
    });
  } catch (err) {
    return jsonError(err);
  }
}
