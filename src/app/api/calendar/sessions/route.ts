import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import {
  bookingSessions,
  bookings,
  clients,
  users,
} from "@/lib/schema";
import { eq, and, or, sql, desc, asc, ne, inArray, gte, lte, lt, gt } from "drizzle-orm";
import { randomUUID } from "crypto";
import { jsonError } from "@/lib/route-utils";
import { ensureMediaTables } from "@/lib/gallery";
import { createSessionEvent } from "@/lib/services/calendar";
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/services/email";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await ensureMediaTables();

    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const statusParam = searchParams.get("status");
    const clientIdParam = searchParams.get("clientId");

    // Fetch all sessions with joined booking and client
    const rows = await db
      .select({
        id: bookingSessions.id,
        bookingId: bookingSessions.bookingId,
        sessionNumber: bookingSessions.sessionNumber,
        scheduledStart: bookingSessions.scheduledStart,
        scheduledEnd: bookingSessions.scheduledEnd,
        durationMinutes: bookingSessions.durationMinutes,
        status: bookingSessions.status,
        notes: bookingSessions.notes,
        consentStatus: bookingSessions.consentStatus,
        overrideReason: bookingSessions.overrideReason,
        createdAt: bookingSessions.createdAt,
        updatedAt: bookingSessions.updatedAt,
        clientId: bookings.clientId,
        serviceType: bookings.serviceType,
        designDescription: bookings.designDescription,
        placement: bookings.placement,
        approximateSize: bookings.approximateSize,
        quotedAmount: bookings.quotedAmount,
        bookingStage: bookings.stage,
        clientName: clients.name,
        clientEmail: clients.email,
        clientPhone: clients.phone,
        clientInstagram: clients.instagramHandle,
      })
      .from(bookingSessions)
      .innerJoin(bookings, eq(bookingSessions.bookingId, bookings.id))
      .innerJoin(clients, eq(bookings.clientId, clients.id))
      .orderBy(asc(bookingSessions.scheduledStart));

    // Optional query filtering
    const filteredRows = rows.filter((r) => {
      if (statusParam && statusParam !== "all" && r.status !== statusParam) return false;
      if (clientIdParam && clientIdParam !== "all" && r.clientId !== clientIdParam) return false;
      if (startParam && new Date(r.scheduledStart) < new Date(startParam)) return false;
      if (endParam && new Date(r.scheduledEnd) > new Date(endParam)) return false;
      return true;
    });

    const sessions = filteredRows.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      sessionNumber: r.sessionNumber,
      scheduledStart: new Date(r.scheduledStart).toISOString(),
      scheduledEnd: new Date(r.scheduledEnd).toISOString(),
      durationMinutes: r.durationMinutes,
      status: r.status,
      notes: r.notes,
      consentStatus: r.consentStatus,
      overrideReason: r.overrideReason,
      createdAt: new Date(r.createdAt).toISOString(),
      client: {
        id: r.clientId,
        name: r.clientName,
        email: r.clientEmail,
        phone: r.clientPhone,
        instagramHandle: r.clientInstagram,
      },
      booking: {
        id: r.bookingId,
        serviceType: r.serviceType,
        designDescription: r.designDescription,
        placement: r.placement,
        approximateSize: r.approximateSize,
        quotedAmount: r.quotedAmount ? r.quotedAmount.toString() : null,
        stage: r.bookingStage,
      },
    }));

    // Fetch clients list for quick selection
    const allClients = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        instagramHandle: clients.instagramHandle,
      })
      .from(clients)
      .orderBy(clients.name);

    return NextResponse.json({
      ok: true,
      sessions,
      clients: allClients,
      total: sessions.length,
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await ensureMediaTables();

    const body = await req.json();
    const {
      bookingId: incomingBookingId,
      clientId,
      newClient,
      scheduledStart,
      durationMinutes = 180,
      serviceType = "Tattoo",
      meetingType,
      sessionType,
      designDescription,
      placement,
      approximateSize,
      quotedAmount,
      notes,
      allowOverlap = false,
      consentStatus = "not_started",
    } = body;

    if (!scheduledStart) {
      return NextResponse.json(
        { ok: false, error: "Scheduled appointment start date & time is required" },
        { status: 400 }
      );
    }

    const start = new Date(scheduledStart);
    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid start date format" },
        { status: 400 }
      );
    }

    const duration = Number(durationMinutes) || 180;
    const end = new Date(start.getTime() + duration * 60 * 1000);

    // 1. CONFLICT DETECTION CHECK
    // Check if any existing active (scheduled or in_progress) session overlaps
    const existingSessions = await db
      .select({
        id: bookingSessions.id,
        scheduledStart: bookingSessions.scheduledStart,
        scheduledEnd: bookingSessions.scheduledEnd,
        status: bookingSessions.status,
        clientName: clients.name,
        serviceType: bookings.serviceType,
      })
      .from(bookingSessions)
      .innerJoin(bookings, eq(bookingSessions.bookingId, bookings.id))
      .innerJoin(clients, eq(bookings.clientId, clients.id))
      .where(
        and(
          or(
            eq(bookingSessions.status, "scheduled"),
            eq(bookingSessions.status, "in_progress")
          ),
          lt(bookingSessions.scheduledStart, end),
          gt(bookingSessions.scheduledEnd, start)
        )
      );

    if (existingSessions.length > 0 && !allowOverlap) {
      const conflict = existingSessions[0];
      const conflictStart = new Date(conflict.scheduledStart).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const conflictEnd = new Date(conflict.scheduledEnd).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      return NextResponse.json(
        {
          ok: false,
          conflict: true,
          conflictingSessions: existingSessions.map((c) => ({
            id: c.id,
            clientName: c.clientName,
            serviceType: c.serviceType,
            start: new Date(c.scheduledStart).toISOString(),
            end: new Date(c.scheduledEnd).toISOString(),
          })),
          error: `Scheduling Conflict: Overlaps with ${conflict.clientName}'s appointment (${conflictStart} to ${conflictEnd}). Check 'Override conflict' to schedule anyway.`,
        },
        { status: 409 }
      );
    }

    // 2. RESOLVE CLIENT & BOOKING PROJECT
    let resolvedClientId = clientId;
    let resolvedClientName = "";
    let resolvedClientPhone = "";
    let resolvedClientEmail = "";
    let targetBookingId = incomingBookingId || null;
    let sessionNumber = 1;

    // Case A: Existing booking ID explicitly provided
    if (targetBookingId) {
      const existingBooking = await db.query.bookings.findFirst({
        where: eq(bookings.id, targetBookingId),
        with: { client: true },
      });

      if (!existingBooking) {
        return NextResponse.json(
          { ok: false, error: "Referenced tattoo booking project not found" },
          { status: 404 }
        );
      }

      resolvedClientId = existingBooking.clientId;
      resolvedClientName = existingBooking.client.name;
      resolvedClientPhone = existingBooking.client.phone;
      resolvedClientEmail = existingBooking.client.email ?? "";

      // Count existing sessions for this booking to determine session number
      const existingSessionsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(bookingSessions)
        .where(eq(bookingSessions.bookingId, existingBooking.id));

      sessionNumber = Number(existingSessionsCount[0]?.count || 0) + 1;

      // Update booking sessionDate and stage
      await db
        .update(bookings)
        .set({
          sessionDate: start,
          sessionDuration: duration,
          stage:
            existingBooking.stage === "deposit_paid" ||
            existingBooking.stage === "qualified" ||
            existingBooking.stage === "deposit_pending"
              ? "scheduled"
              : existingBooking.stage,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, existingBooking.id));
    }
    // Case B: New client registration
    else if (newClient) {
      if (!newClient.name || !newClient.email || !newClient.phone) {
        return NextResponse.json(
          { ok: false, error: "New client requires Name, Email, and Phone number" },
          { status: 400 }
        );
      }

      const existingClient = await db
        .select()
        .from(clients)
        .where(or(eq(clients.email, newClient.email), eq(clients.phone, newClient.phone)))
        .limit(1);

      if (existingClient.length > 0) {
        resolvedClientId = existingClient[0].id;
        resolvedClientName = existingClient[0].name;
        resolvedClientPhone = existingClient[0].phone;
      } else {
        resolvedClientId = randomUUID();
        resolvedClientName = newClient.name;
        resolvedClientPhone = newClient.phone;
        resolvedClientEmail = newClient.email;

        await db.insert(clients).values({
          id: resolvedClientId,
          name: newClient.name,
          email: newClient.email,
          phone: newClient.phone,
          instagramHandle: newClient.instagramHandle || null,
          notes: newClient.notes || null,
          totalSpend: BigInt(0),
          bookingsCount: 1,
        });
      }

      targetBookingId = randomUUID();
      await db.insert(bookings).values({
        id: targetBookingId,
        clientId: resolvedClientId,
        artistId: user.id,
        serviceType: serviceType || "Custom Tattoo",
        designDescription: designDescription || null,
        placement: placement || null,
        approximateSize: approximateSize || null,
        quotedAmount: quotedAmount ? BigInt(quotedAmount) : null,
        stage: "scheduled",
        sessionDate: start,
        sessionDuration: duration,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      sessionNumber = 1;
    }
    // Case C: Existing client ID provided (without specific booking ID)
    else if (resolvedClientId) {
      const client = await db.query.clients.findFirst({
        where: eq(clients.id, resolvedClientId),
      });
      if (!client) {
        return NextResponse.json({ ok: false, error: "Selected client not found" }, { status: 404 });
      }
      resolvedClientName = client.name;
      resolvedClientPhone = client.phone;
      resolvedClientEmail = client.email ?? "";

      // Check if client already has an active, non-terminal booking
      const activeBooking = await db.query.bookings.findFirst({
        where: and(
          eq(bookings.clientId, client.id),
          ne(bookings.stage, "not_a_fit"),
          ne(bookings.stage, "closed_followup")
        ),
        orderBy: [desc(bookings.createdAt)],
      });

      if (activeBooking) {
        targetBookingId = activeBooking.id;
        const existingSessionsCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(bookingSessions)
          .where(eq(bookingSessions.bookingId, targetBookingId));

        sessionNumber = Number(existingSessionsCount[0]?.count || 0) + 1;

        await db
          .update(bookings)
          .set({
            sessionDate: start,
            sessionDuration: duration,
            stage:
              activeBooking.stage === "deposit_paid" || activeBooking.stage === "qualified"
                ? "scheduled"
                : activeBooking.stage,
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, targetBookingId));
      } else {
        targetBookingId = randomUUID();
        await db.insert(bookings).values({
          id: targetBookingId,
          clientId: resolvedClientId,
          artistId: user.id,
          serviceType: serviceType || "Custom Tattoo",
          designDescription: designDescription || null,
          placement: placement || null,
          approximateSize: approximateSize || null,
          quotedAmount: quotedAmount ? BigInt(quotedAmount) : null,
          stage: "scheduled",
          sessionDate: start,
          sessionDuration: duration,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        sessionNumber = 1;
      }
    } else {
      return NextResponse.json(
        { ok: false, error: "Either select an existing client or enter new client details" },
        { status: 400 }
      );
    }

    // 3. FORMAT MEETING / SESSION TYPE TAG IN NOTES
    const chosenMeeting = meetingType || sessionType;
    let meetingTag = "";
    let meetingDisplayName = "Tattoo Session";

    if (chosenMeeting === "consultation") {
      meetingTag = "[Consultation]";
      meetingDisplayName = "Design Consultation";
    } else if (chosenMeeting === "touch_up") {
      meetingTag = "[Touch-up]";
      meetingDisplayName = "Touch-up Session";
    } else if (chosenMeeting === "healed_review") {
      meetingTag = "[Healed Review]";
      meetingDisplayName = "Healed Photo Review";
    } else {
      meetingTag = `[Tattoo Session #${sessionNumber}]`;
      meetingDisplayName = `Tattoo Session #${sessionNumber}`;
    }

    const formattedNotes = notes
      ? notes.startsWith("[")
        ? notes
        : `${meetingTag} ${notes}`
      : meetingTag;

    // 4. CREATE SESSION RECORD
    const sessionId = randomUUID();
    const [session] = await db
      .insert(bookingSessions)
      .values({
        id: sessionId,
        bookingId: targetBookingId,
        sessionNumber,
        scheduledStart: start,
        scheduledEnd: end,
        durationMinutes: duration,
        status: "scheduled",
        notes: formattedNotes || null,
        consentStatus: consentStatus || "not_started",
        overrideReason: allowOverlap ? "Artist override for schedule overlap" : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 5. ATTEMPT GOOGLE CALENDAR SYNC (non-fatal)
    try {
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN) {
        await createSessionEvent({
          summary: `${meetingDisplayName} - ${resolvedClientName} (${serviceType})`,
          description: [
            placement ? `Placement: ${placement}` : null,
            designDescription ? `Design: ${designDescription}` : null,
            notes ? `Studio Notes: ${notes}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          start,
          end,
          attendeeEmail: resolvedClientEmail ?? undefined,
        });
      }
    } catch (calErr) {
      console.warn("Google Calendar sync skipped:", calErr);
    }

    // 6. PREPARE QUICK WHATSAPP CONFIRMATION MESSAGE & URL
    const cleanPhone = resolvedClientPhone.replace(/[^0-9]/g, "");
    const dateFormatted = start.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const startTimeStr = start.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const endTimeStr = end.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const durationHours = (duration / 60).toFixed(duration % 60 === 0 ? 0 : 1);

    const whatsappMessage =
      `Hi ${resolvedClientName}! ✨\n\n` +
      `Your ${meetingDisplayName.toLowerCase()} with Prerna at Meet Prerna Studio is confirmed:\n` +
      `📅 Date: ${dateFormatted}\n` +
      `⏰ Time: ${startTimeStr} to ${endTimeStr} (${durationHours} hrs)\n` +
      `🎨 Type: ${meetingDisplayName}${placement ? ` (${placement})` : ""}\n` +
      `📍 Studio: Indiranagar, Bangalore\n\n` +
      `Please arrive 10 minutes early. Looking forward to our session!`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    // 7. SEND CONFIRMATION EMAILS TO BOTH PARTIES
    const clientEmailHtml = EMAIL_TEMPLATES.sessionConfirmation(
      resolvedClientName,
      `${dateFormatted} at ${startTimeStr}`,
      "Meet Prerna Studio, Indiranagar, Bangalore",
      "Please arrive 10 minutes early. Looking forward to your session!"
    );
    const artistEmailHtml = `
      <p>Hi ${user.name ?? "Artist"},</p>
      <p>A new appointment has been scheduled:</p>
      <ul>
        <li><strong>Client:</strong> ${resolvedClientName}</li>
        <li><strong>Service:</strong> ${meetingDisplayName}${placement ? ` (${placement})` : ""}</li>
        <li><strong>Date:</strong> ${dateFormatted}</li>
        <li><strong>Time:</strong> ${startTimeStr} to ${endTimeStr} (${durationHours} hrs)</li>
        <li><strong>Client phone:</strong> ${resolvedClientPhone}</li>
        <li><strong>Client email:</strong> ${resolvedClientEmail}</li>
      </ul>
      <p>Booking ID: ${targetBookingId}</p>
    `;

    const emailPromises = [];
    if (resolvedClientEmail) {
      emailPromises.push(
        sendEmail({
          to: resolvedClientEmail,
          subject: clientEmailHtml.subject,
          html: clientEmailHtml.html,
          text: clientEmailHtml.text,
        }).catch((err) => console.error("Client confirmation email failed:", err))
      );
    }
    if (user.email) {
      emailPromises.push(
        sendEmail({
          to: user.email,
          subject: "New appointment scheduled",
          html: artistEmailHtml,
          text: `New appointment: ${resolvedClientName} on ${dateFormatted} at ${startTimeStr}`,
        }).catch((err) => console.error("Artist notification email failed:", err))
      );
    }
    await Promise.allSettled(emailPromises);

    return NextResponse.json({
      ok: true,
      session: {
        ...session,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      },
      bookingId: targetBookingId,
      client: {
        id: resolvedClientId,
        name: resolvedClientName,
        phone: resolvedClientPhone,
      },
      whatsappMessage,
      whatsappUrl,
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await ensureMediaTables();

    const body = await req.json();
    const { id, status, consentStatus, notes, scheduledStart, durationMinutes, allowOverlap } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "Session ID is required" }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (status) updates.status = status;
    if (consentStatus) updates.consentStatus = consentStatus;
    if (notes !== undefined) updates.notes = notes;

    if (scheduledStart) {
      const newStart = new Date(scheduledStart);
      const duration = Number(durationMinutes) || 180;
      const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);

      // Check conflicts for rescheduling
      if (!allowOverlap && (status === "scheduled" || !status)) {
        const conflicts = await db
          .select({
            id: bookingSessions.id,
            scheduledStart: bookingSessions.scheduledStart,
            scheduledEnd: bookingSessions.scheduledEnd,
            clientName: clients.name,
          })
          .from(bookingSessions)
          .innerJoin(bookings, eq(bookingSessions.bookingId, bookings.id))
          .innerJoin(clients, eq(bookings.clientId, clients.id))
          .where(
            and(
              ne(bookingSessions.id, id),
              or(
                eq(bookingSessions.status, "scheduled"),
                eq(bookingSessions.status, "in_progress")
              ),
              lt(bookingSessions.scheduledStart, newEnd),
              gt(bookingSessions.scheduledEnd, newStart)
            )
          );

        if (conflicts.length > 0) {
          const c = conflicts[0];
          return NextResponse.json(
            {
              ok: false,
              conflict: true,
              error: `Conflict detected: Overlaps with ${c.clientName}'s appointment.`,
            },
            { status: 409 }
          );
        }
      }

      updates.scheduledStart = newStart;
      updates.scheduledEnd = newEnd;
      updates.durationMinutes = duration;

      // Also update booking sessionDate
      const existingSession = await db.query.bookingSessions.findFirst({
        where: eq(bookingSessions.id, id),
      });
      if (existingSession?.bookingId) {
        await db
          .update(bookings)
          .set({ sessionDate: newStart, sessionDuration: duration })
          .where(eq(bookings.id, existingSession.bookingId));
      }
    }

    const [updated] = await db
      .update(bookingSessions)
      .set(updates)
      .where(eq(bookingSessions.id, id))
      .returning();

    // Notify both parties on reschedule
    if (updates.scheduledStart) {
      const sessionWithClient = await db.query.bookingSessions.findFirst({
        where: eq(bookingSessions.id, id),
        with: { booking: { with: { client: true } } },
      });
      if (sessionWithClient?.booking?.client) {
        const client = sessionWithClient.booking.client;
        const newStart = new Date(updates.scheduledStart);
        const newEnd = new Date(updates.scheduledEnd || newStart.getTime() + (updates.durationMinutes || 180) * 60000);
        const dateFormatted = newStart.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
        const startTimeStr = newStart.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
        const endTimeStr = newEnd.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

        const clientRescheduleHtml = EMAIL_TEMPLATES.sessionConfirmation(
          client.name,
          `${dateFormatted} at ${startTimeStr}`,
          "Meet Prerna Studio, Indiranagar, Bangalore",
          "Please arrive 10 minutes early. Your appointment has been rescheduled."
        );
        const artistRescheduleHtml = `
          <p>Hi ${user.name ?? "Artist"},</p>
          <p>An appointment has been rescheduled:</p>
          <ul>
            <li><strong>Client:</strong> ${client.name}</li>
            <li><strong>New date:</strong> ${dateFormatted}</li>
            <li><strong>New time:</strong> ${startTimeStr} to ${endTimeStr}</li>
            <li><strong>Client phone:</strong> ${client.phone}</li>
            <li><strong>Client email:</strong> ${client.email}</li>
          </ul>
          <p>Session ID: ${id}</p>
        `;

        const reschedulePromises = [];
        if (client.email) {
          reschedulePromises.push(
            sendEmail({
              to: client.email,
              subject: clientRescheduleHtml.subject,
              html: clientRescheduleHtml.html,
              text: clientRescheduleHtml.text,
            }).catch((err) => console.error("Client reschedule email failed:", err))
          );
        }
        if (user.email) {
          reschedulePromises.push(
            sendEmail({
              to: user.email,
              subject: "Appointment rescheduled",
              html: artistRescheduleHtml,
              text: `Rescheduled: ${client.name} on ${dateFormatted} at ${startTimeStr}`,
            }).catch((err) => console.error("Artist reschedule email failed:", err))
          );
        }
        await Promise.allSettled(reschedulePromises);
      }
    }

    return NextResponse.json({ ok: true, session: updated });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await ensureMediaTables();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "Session ID is required" }, { status: 400 });
    }

    // Fetch session details before cancelling so we can notify both parties
    const sessionToCancel = await db.query.bookingSessions.findFirst({
      where: eq(bookingSessions.id, id),
      with: { booking: { with: { client: true } } },
    });

    // Mark as cancelled rather than hard deleting to preserve audit history
    await db
      .update(bookingSessions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookingSessions.id, id));

    // Notify both parties on cancellation
    if (sessionToCancel?.booking?.client) {
      const client = sessionToCancel.booking.client;
      const start = new Date(sessionToCancel.scheduledStart);
      const dateFormatted = start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      const startTimeStr = start.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

      const clientCancelHtml = `
        <p>Hi ${client.name},</p>
        <p>Your appointment on ${dateFormatted} at ${startTimeStr} has been cancelled.</p>
        <p>Please contact the studio to reschedule.</p>
      `;
      const artistCancelHtml = `
        <p>Hi ${user.name ?? "Artist"},</p>
        <p>An appointment has been cancelled:</p>
        <ul>
          <li><strong>Client:</strong> ${client.name}</li>
          <li><strong>Date:</strong> ${dateFormatted}</li>
          <li><strong>Time:</strong> ${startTimeStr}</li>
          <li><strong>Client phone:</strong> ${client.phone}</li>
          <li><strong>Client email:</strong> ${client.email}</li>
        </ul>
        <p>Session ID: ${id}</p>
      `;

      const cancelPromises = [];
      if (client.email) {
        cancelPromises.push(
          sendEmail({
            to: client.email,
            subject: "Appointment cancelled",
            html: clientCancelHtml,
            text: `Hi ${client.name}, your appointment on ${dateFormatted} at ${startTimeStr} has been cancelled.`,
          }).catch((err) => console.error("Client cancel email failed:", err))
        );
      }
      if (user.email) {
        cancelPromises.push(
          sendEmail({
            to: user.email,
            subject: "Appointment cancelled",
            html: artistCancelHtml,
            text: `Cancelled: ${client.name} on ${dateFormatted} at ${startTimeStr}`,
          }).catch((err) => console.error("Artist cancel email failed:", err))
        );
      }
      await Promise.allSettled(cancelPromises);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
