import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createEnquiry } from "@/lib/workflows";
import { jsonError } from "@/lib/route-utils";

const enquirySchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(8, "Valid phone is required"),
  serviceType: z.string().optional().default("Tattoo"),
  city: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  tattooTimeline: z.string().optional(),
  instagramHandle: z.string().optional(),
  message: z.string().optional(),
  designDescription: z.string().optional(),
  referenceImages: z.array(z.string()).optional(),
  preferredDateStart: z.string().optional(),
  preferredDateEnd: z.string().optional(),
  estimatedBudget: z.number().min(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = enquirySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const input = parsed.data;
    const artistId = process.env.DEFAULT_ARTIST_ID ?? "artist-1";
    const result = await createEnquiry(
      {
        ...input,
        city: input.city,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        tattooTimeline: input.tattooTimeline,
        instagramHandle: input.instagramHandle,
        message: input.message,
        referenceImages: input.referenceImages,
        preferredDateRangeStart: input.preferredDateStart
          ? new Date(input.preferredDateStart)
          : undefined,
        preferredDateRangeEnd: input.preferredDateEnd
          ? new Date(input.preferredDateEnd)
          : undefined,
      },
      artistId
    );
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error ?? "Failed to create enquiry" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, bookingId: result.bookingId, duplicate: result.duplicate });
  } catch (err) {
    return jsonError(err);
  }
}
