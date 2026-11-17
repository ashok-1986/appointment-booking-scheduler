import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookings,
  bookingSessions,
  consentRecords,
  consentForms,
  auditLogs,
} from "@/lib/schema";
import { addNote } from "@/lib/services/hubspot";
import { jsonError } from "@/lib/route-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const body = await req.json();

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "127.0.0.1";
    const ua = req.headers.get("user-agent") ?? "unknown";

    // Normalize payload supporting both modern digital consent and backwards-compatible fields
    const legalName = (body.legalName || body.fullName || "").trim();
    const dateOfBirth = (body.dateOfBirth || "").trim();
    const signatureImageUrl = (body.signatureImageUrl || body.signature || "").trim();
    const procedureConsent =
      typeof body.procedureConsent === "boolean"
        ? body.procedureConsent
        : body.healthDisclosure === true && body.designApproval === true;
    const photographyConsent =
      typeof body.photographyConsent === "boolean"
        ? body.photographyConsent
        : body.photoPermission === true;
    const marketingConsent = !!body.marketingConsent;

    const healthDisclosures = body.healthDisclosures || {
      allergies: false,
      allergiesDetails: "",
      bloodThinners: false,
      skinConditions: false,
      skinConditionsDetails: "",
      pregnantOrNursing: false,
      cardiacOrEpileptic: false,
    };

    // 1. Validate mandatory inputs
    if (!legalName || legalName.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Client Legal Name is required (min 2 characters)." },
        { status: 400 }
      );
    }

    if (!procedureConsent) {
      return NextResponse.json(
        { ok: false, error: "Procedure consent is mandatory to receive a tattoo." },
        { status: 400 }
      );
    }

    if (!signatureImageUrl || signatureImageUrl.length < 10) {
      return NextResponse.json(
        { ok: false, error: "A valid digital signature is required." },
        { status: 400 }
      );
    }

    // 2. Validate Age (Must be 18+)
    let ageVerified = false;
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      if (isNaN(birthDate.getTime())) {
        return NextResponse.json(
          { ok: false, error: "Invalid date of birth provided." },
          { status: 400 }
        );
      }
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18) {
        return NextResponse.json(
          {
            ok: false,
            error: "Client must be at least 18 years of age to legally consent to tattoo procedures.",
          },
          { status: 400 }
        );
      }
      ageVerified = true;
    } else {
      // If legacy client omitted DOB, require it unless client already verified
      return NextResponse.json(
        { ok: false, error: "Date of Birth is required for 18+ age verification." },
        { status: 400 }
      );
    }

    // 3. Locate Booking & Client
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      with: { client: true },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found." },
        { status: 404 }
      );
    }

    const now = new Date();
    const consentRecordId = randomUUID();

    // 4. Find Associated Booking Session (if any)
    const sessions = await db
      .select()
      .from(bookingSessions)
      .where(eq(bookingSessions.bookingId, bookingId))
      .orderBy(asc(bookingSessions.scheduledStart));

    const primarySessionId = sessions.length > 0 ? sessions[0].id : null;

    // 5. Save Digital Consent into consent_records
    await db.insert(consentRecords).values({
      id: consentRecordId,
      sessionId: primarySessionId,
      bookingId,
      clientId: booking.clientId,
      legalName,
      dateOfBirth,
      ageVerified,
      healthDisclosures: {
        allergies: !!healthDisclosures.allergies,
        allergiesDetails: healthDisclosures.allergiesDetails || "",
        bloodThinners: !!healthDisclosures.bloodThinners,
        skinConditions: !!healthDisclosures.skinConditions,
        skinConditionsDetails: healthDisclosures.skinConditionsDetails || "",
        pregnantOrNursing: !!healthDisclosures.pregnantOrNursing,
        cardiacOrEpileptic: !!healthDisclosures.cardiacOrEpileptic,
      },
      procedureConsent: true,
      photographyConsent,
      marketingConsent,
      signatureImageUrl,
      pdfUrl: null,
      signerIp: ip,
      signerUserAgent: ua,
      signedAt: now,
      createdAt: now,
    });

    // 6. Save / Upsert into legacy consent_forms table
    const existingConsentForm = await db.query.consentForms.findFirst({
      where: eq(consentForms.bookingId, bookingId),
    });

    const legacyPayload = {
      fullName: legalName,
      dateOfBirth,
      procedureConsent: true,
      photographyConsent,
      marketingConsent,
      healthDisclosure: true,
      designApproval: true,
      photoPermission: photographyConsent,
      signature: signatureImageUrl,
      signedAt: now.toISOString(),
      healthDisclosures,
    };

    if (existingConsentForm) {
      await db
        .update(consentForms)
        .set({
          signedData: legacyPayload,
          signedAt: now,
          ipAddress: ip,
          userAgent: ua,
          updatedAt: now,
        })
        .where(eq(consentForms.bookingId, bookingId));
    } else {
      await db.insert(consentForms).values({
        id: randomUUID(),
        bookingId,
        formData: {
          legalName,
          dateOfBirth,
          healthDisclosures,
          procedureConsent: true,
          photographyConsent,
          marketingConsent,
        },
        signedData: legacyPayload,
        signedAt: now,
        ipAddress: ip,
        userAgent: ua,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 7. Update booking_sessions.consent_status = 'signed' for associated sessions
    await db
      .update(bookingSessions)
      .set({ consentStatus: "signed" })
      .where(eq(bookingSessions.bookingId, bookingId));

    // 8. Update bookings.consent_signed_at = now()
    await db
      .update(bookings)
      .set({
        consentSignedAt: now,
        consentFormId: consentRecordId,
      })
      .where(eq(bookings.id, bookingId));

    // 9. Log Audit Trail Entry
    await db.insert(auditLogs).values({
      id: randomUUID(),
      bookingId,
      userId: null,
      action: "consent.signed",
      oldValue: null,
      newValue: {
        consentRecordId,
        legalName,
        dateOfBirth,
        ageVerified: true,
        procedureConsent: true,
        photographyConsent,
        marketingConsent,
      },
      metadata: {
        ip,
        userAgent: ua,
        signedAt: now.toISOString(),
        primarySessionId,
      },
      createdAt: now,
    });

    // 10. Optional HubSpot update if deal exists
    if (booking.hubspotDealId) {
      try {
        await addNote(
          booking.hubspotDealId,
          `Digital Consent signed by ${legalName} (Age verified 18+). Photo: ${
            photographyConsent ? "Granted" : "Declined"
          }, Marketing: ${marketingConsent ? "Granted" : "Declined"}.`
        );
      } catch (err) {
        console.error("HubSpot note logging failed:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      consentRecordId,
      signedAt: now.toISOString(),
      legalName,
      dateOfBirth,
      procedureConsent: true,
      photographyConsent,
      marketingConsent,
    });
  } catch (err) {
    return jsonError(err);
  }
}
