"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-utils";
import * as workflow from "@/lib/workflows";

export async function createEnquiryAction(
  input: workflow.EnquiryInput
): Promise<{ ok: boolean; bookingId?: string; duplicate?: boolean; error?: string }> {
  const user = await requireUser();
  const result = await workflow.createEnquiry(input, user.id);
  revalidatePath("/dashboard");
  return result;
}

export async function updateConsultationStatusAction(
  bookingId: string,
  status: "in_consultation" | "qualified" | "not_a_fit",
  reason?: string
) {
  const user = await requireUser();
  const result = await workflow.updateConsultationStatus(bookingId, status, reason, user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return result;
}

export async function createDepositPaymentLinkAction(
  bookingId: string,
  amount: number
) {
  const user = await requireUser();
  const result = await workflow.createDepositPaymentLink(bookingId, amount, user.id);
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return result;
}

export async function createBalancePaymentLinkAction(
  bookingId: string,
  amount: number
) {
  const user = await requireUser();
  const result = await workflow.createBalancePaymentLink(bookingId, amount, user.id);
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return result;
}

export async function proposeSessionDatesAction(
  bookingId: string,
  slots: Array<{ start: Date; end: Date }>
) {
  const user = await requireUser();
  const result = await workflow.proposeSessionDates(bookingId, slots, user.id);
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return result;
}

export async function confirmSessionDateAction(
  bookingId: string,
  slot: { start: Date; end: Date }
) {
  const user = await requireUser();
  const result = await workflow.confirmSessionDate(bookingId, slot, user.id);
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return result;
}

export async function sendConsentFormAction(bookingId: string, formUrl: string) {
  const user = await requireUser();
  const result = await workflow.sendConsentForm(bookingId, formUrl);
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return result;
}

export async function markSessionCompleteAction(
  bookingId: string,
  durationMinutes: number,
  photos?: string[]
) {
  const user = await requireUser();
  const result = await workflow.markSessionComplete(bookingId, durationMinutes, user.id, photos);
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath("/dashboard");
  return result;
}

export async function sendHealedPhotoFollowUpAction(bookingId: string) {
  const user = await requireUser();
  const result = await workflow.sendHealedPhotoFollowUp(bookingId, user.id);
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return result;
}

export async function listBookingsAction(
  filters?: { stage?: string }
): Promise<workflow.BookingWithClient[]> {
  const user = await requireUser();
  return workflow.listBookings({ ...filters, artistId: user.id });
}

export async function getBookingAction(id: string) {
  await requireUser();
  return workflow.getBooking(id);
}

export async function listMessagesAction(bookingId: string) {
  await requireUser();
  return workflow.listMessages(bookingId);
}

export async function listPaymentsAction(bookingId: string) {
  await requireUser();
  return workflow.listPayments(bookingId);
}

export async function getConsentFormAction(bookingId: string) {
  await requireUser();
  return workflow.getConsentForm(bookingId);
}
