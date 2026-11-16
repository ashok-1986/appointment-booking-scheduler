"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  Instagram,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { parseBookingDetails, formatPaise } from "@/lib/booking-parser";

type Stage =
  | "enquiry"
  | "in_consultation"
  | "qualified"
  | "not_a_fit"
  | "deposit_requested"
  | "deposit_pending"
  | "deposit_paid"
  | "scheduled"
  | "session_complete"
  | "paid_in_full"
  | "follow_up_sent"
  | "follow_up_completed";

type Booking = {
  id: string;
  serviceType: string;
  stage: Stage;
  designDescription: string | null;
  referenceImages?: string[] | null;
  sessionDate: string | null;
  sessionDuration: number | null;
  depositAmount: string | null;
  balanceAmount: string | null;
  depositPaidAt: string | null;
  balancePaidAt: string | null;
  consentSignedAt: string | null;
  consultationNotes: string | null;
  rejectionReason: string | null;
  followUpRating: number | null;
  followUpFeedback: string | null;
  createdAt: string;
  client: { id: string; name: string; email: string; phone: string };
};

type Message = {
  id: string;
  channel: "whatsapp" | "email";
  direction: "inbound" | "outbound";
  content: string;
  createdAt: string;
};

type Payment = {
  id: string;
  type: "deposit" | "balance";
  amount: string;
  status: string;
  providerRef: string;
  paidAt: string | null;
};

const STAGE_LABELS: Record<Stage, string> = {
  enquiry: "Enquiry",
  in_consultation: "In Consultation",
  qualified: "Qualified",
  not_a_fit: "Not a Fit",
  deposit_requested: "Deposit Requested",
  deposit_pending: "Deposit Pending",
  deposit_paid: "Deposit Paid",
  scheduled: "Scheduled",
  session_complete: "Session Complete",
  paid_in_full: "Paid in Full",
  follow_up_sent: "Follow-up Sent",
  follow_up_completed: "Follow-up Completed",
};

const STAGE_STEPS: { stage: Stage; num: number; label: string }[] = [
  { stage: "enquiry", num: 1, label: "Enquiry" },
  { stage: "in_consultation", num: 2, label: "Consultation" },
  { stage: "qualified", num: 3, label: "Qualified" },
  { stage: "deposit_requested", num: 4, label: "Deposit Req" },
  { stage: "deposit_pending", num: 5, label: "Deposit Pend" },
  { stage: "deposit_paid", num: 6, label: "Deposit Paid" },
  { stage: "scheduled", num: 7, label: "Scheduled" },
  { stage: "session_complete", num: 8, label: "Session Done" },
  { stage: "paid_in_full", num: 9, label: "Paid in Full" },
  { stage: "follow_up_sent", num: 10, label: "Follow-up" },
  { stage: "follow_up_completed", num: 11, label: "Completed" },
];

export default function BookingDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const [consultationStatus, setConsultationStatus] = useState<
    "in_consultation" | "qualified" | "not_a_fit"
  >("in_consultation");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const [depositAmount, setDepositAmount] = useState("");
  const [balanceAmount, setBalanceAmount] = useState("");

  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");

  const [waMessage, setWaMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [bRes, mRes, pRes] = await Promise.all([
        fetch(`/api/bookings/${id}`),
        fetch(`/api/bookings/${id}/messages`),
        fetch(`/api/bookings/${id}/payments`),
      ]);
      if (!bRes.ok) throw new Error("Failed to load booking");
      const b = await bRes.json();
      setBooking(b);
      setMessages(await mRes.json());
      setPayments(await pRes.json());
      if (b.depositAmount) setDepositAmount(String(Number(b.depositAmount) / 100));
      if (b.balanceAmount) setBalanceAmount(String(Number(b.balanceAmount) / 100));
    } catch (err: any) {
      toast.error(err.message || "Failed to load booking");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function callAction(
    key: string,
    fn: () => Promise<{ ok: boolean; error?: string }>
  ) {
    setActionPending(key);
    try {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error || "Action failed");
        return;
      }
      toast.success("Action completed successfully");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    } finally {
      setActionPending(null);
    }
  }

  const intake = useMemo(() => {
    return parseBookingDetails(booking?.designDescription);
  }, [booking?.designDescription]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3 font-body">
        <Loader2 className="size-8 animate-spin text-[#C4FF61]" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Loading Client Dossier…
        </p>
      </div>
    );
  }

  if (!booking) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-20 text-center font-body">
          <p className="text-muted-foreground mb-4">Client booking not found or was removed.</p>
          <Link href="/dashboard/bookings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 size-4" /> Return to Bookings
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const currentStepIndex = STAGE_STEPS.findIndex((s) => s.stage === booking.stage);
  const isNotAFit = booking.stage === "not_a_fit";

  const cleanPhone = booking.client.phone.replace(/[^0-9]/g, "");
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hi ${booking.client.name}, this is Prerna from Meet Prerna Tattoo Studio.`
      )}`
    : null;

  return (
    <div className="space-y-8 font-body">
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/bookings">
            <Button
              variant="outline"
              size="icon"
              className="size-10 rounded-full border-border/80 hover:border-[#C4FF61] hover:bg-[#C4FF61]/10"
              aria-label="Back to bookings"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Dossier · {booking.serviceType}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                Enquired {format(new Date(booking.createdAt), "MMM d, yyyy")}
              </span>
            </div>
            <h1 className="font-heading font-cormorant text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              {booking.client.name}
            </h1>
          </div>
        </div>

        {/* Quick Contact & Stage Pill */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 transition-colors"
            >
              <MessageCircle className="size-3.5" />
              <span>WhatsApp</span>
            </a>
          )}

          <a
            href={`mailto:${booking.client.email}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Mail className="size-3.5 text-muted-foreground" />
            <span>Email</span>
          </a>

          <a
            href={`tel:${booking.client.phone}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Phone className="size-3.5 text-muted-foreground" />
            <span>Call</span>
          </a>

          <Badge
            className={`px-3 py-1 text-xs font-medium ${
              isNotAFit
                ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                : "bg-[#1A1A1A] text-[#C4FF61] dark:bg-[#C4FF61] dark:text-[#1A1A1A]"
            }`}
          >
            {STAGE_LABELS[booking.stage]}
          </Badge>
        </div>
      </div>

      {/* 12-Stage Visual Progress Stepper */}
      <Card className="overflow-hidden bg-card border-border/80">
        <CardHeader className="py-4 px-6 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Booking Progression Pipeline
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              Stage {currentStepIndex >= 0 ? currentStepIndex + 1 : 0} of {STAGE_STEPS.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isNotAFit ? (
            <div className="flex items-center gap-3 rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300">
              <XCircle className="size-5 text-zinc-500 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold">Booking Closed: Not a Fit. </span>
                {booking.rejectionReason ? `Reason: ${booking.rejectionReason}` : "Marked not a fit for studio aesthetic."}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-2">
              {STAGE_STEPS.map((step, idx) => {
                const isPassed = currentStepIndex > idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div
                    key={step.stage}
                    className={`relative flex flex-col items-center justify-center rounded-lg p-2.5 text-center transition-all ${
                      isCurrent
                        ? "bg-[#1A1A1A] text-white ring-2 ring-[#C4FF61] dark:bg-zinc-900 shadow-sm"
                        : isPassed
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-center size-5 rounded-full mb-1 text-[10px] font-mono font-bold">
                      {isPassed ? (
                        <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                      ) : isCurrent ? (
                        <span className="size-2 rounded-full bg-[#C4FF61] animate-ping" />
                      ) : (
                        <span>{step.num}</span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium truncate max-w-full">
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2-Column Responsive Workspace */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Action Center & Timeline (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Active Stage Action Card */}
          <div className="space-y-4">
            <h2 className="font-heading font-cormorant text-2xl font-semibold text-foreground">
              Current Stage Actions
            </h2>

            {/* Stage 1-2: Consultation & Qualification */}
            {["enquiry", "in_consultation", "qualified"].includes(booking.stage) && (
              <Card className="border-[#C4FF61]/50 shadow-xs">
                <CardHeader>
                  <CardTitle className="font-heading font-cormorant text-xl">
                    Client Consultation &amp; Vetting
                  </CardTitle>
                  <CardDescription className="font-body text-xs">
                    Evaluate aesthetic alignment, review intake details, and qualify or archive.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <Button
                      variant={consultationStatus === "in_consultation" ? "default" : "outline"}
                      className={`text-xs h-9 ${
                        consultationStatus === "in_consultation"
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : ""
                      }`}
                      onClick={() => setConsultationStatus("in_consultation")}
                    >
                      In Consultation
                    </Button>
                    <Button
                      variant={consultationStatus === "qualified" ? "default" : "outline"}
                      className={`text-xs h-9 ${
                        consultationStatus === "qualified"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : ""
                      }`}
                      onClick={() => setConsultationStatus("qualified")}
                    >
                      Qualify Client
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs h-9 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
                      onClick={() => setShowRejectDialog(true)}
                    >
                      Not a Fit
                    </Button>
                  </div>

                  <Textarea
                    placeholder="Enter artist notes from phone or WhatsApp consultation…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="text-xs font-body"
                  />

                  <Button
                    onClick={() =>
                      callAction("consultation", async () => {
                        const res = await fetch(`/api/bookings/${id}/consultation`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            status: consultationStatus,
                            reason: consultationStatus === "not_a_fit" ? rejectionReason : undefined,
                            notes: notes.trim() || undefined,
                          }),
                        });
                        return res.json();
                      })
                    }
                    disabled={actionPending === "consultation"}
                    className="w-full sm:w-auto bg-[#1A1A1A] hover:bg-black text-[#C4FF61] dark:bg-[#C4FF61] dark:text-[#1A1A1A] text-xs font-medium"
                  >
                    {actionPending === "consultation" ? (
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 size-3.5" />
                    )}
                    Save &amp; Update Stage
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Stage 3-4: Deposit Generation */}
            {["qualified", "deposit_requested", "deposit_pending"].includes(booking.stage) && (
              <Card className="border-orange-300 dark:border-orange-900/60 shadow-xs">
                <CardHeader>
                  <CardTitle className="font-heading font-cormorant text-xl">
                    Generate Deposit Payment Link
                  </CardTitle>
                  <CardDescription className="font-body text-xs">
                    Create a secure Razorpay payment link. Sent automatically via WhatsApp &amp; Email with 72h expiry.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="3,000"
                        className="pl-7 h-10 font-mono text-sm"
                      />
                    </div>

                    <Button
                      onClick={() =>
                        callAction("deposit", async () => {
                          const res = await fetch(`/api/bookings/${id}/deposit-link`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ amount: Number(depositAmount) * 100 }),
                          });
                          return res.json();
                        })
                      }
                      disabled={actionPending === "deposit" || !depositAmount}
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-10 font-medium"
                    >
                      {actionPending === "deposit" ? (
                        <Loader2 className="mr-2 size-3.5 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 size-3.5" />
                      )}
                      Create &amp; Dispatch Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stage 5: Scheduling */}
            {["deposit_paid"].includes(booking.stage) && (
              <Card className="border-blue-300 dark:border-blue-900/60 shadow-xs">
                <CardHeader>
                  <CardTitle className="font-heading font-cormorant text-xl">
                    Session Scheduling
                  </CardTitle>
                  <CardDescription className="font-body text-xs">
                    Deposit received! Coordinate calendar slot and confirm the tattoo session date.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                        Session Start
                      </label>
                      <Input
                        type="datetime-local"
                        value={slotStart}
                        onChange={(e) => setSlotStart(e.target.value)}
                        className="text-xs h-10"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                        Session End
                      </label>
                      <Input
                        type="datetime-local"
                        value={slotEnd}
                        onChange={(e) => setSlotEnd(e.target.value)}
                        className="text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      onClick={() =>
                        callAction("propose", async () => {
                          const start = new Date(slotStart);
                          const end = new Date(slotEnd);
                          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                            return { ok: false, error: "Please enter valid start and end dates" };
                          }
                          const res = await fetch(`/api/bookings/${id}/propose`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ slots: [{ start, end }] }),
                          });
                          return res.json();
                        })
                      }
                      disabled={actionPending === "propose" || !slotStart || !slotEnd}
                      variant="outline"
                      className="text-xs h-9"
                    >
                      {actionPending === "propose" && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                      <Send className="mr-2 size-3.5" />
                      Propose Slot to Client
                    </Button>

                    <Button
                      onClick={() =>
                        callAction("confirm", async () => {
                          const start = new Date(slotStart);
                          const end = new Date(slotEnd);
                          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                            return { ok: false, error: "Please enter valid dates to confirm" };
                          }
                          const res = await fetch(`/api/bookings/${id}/confirm-session`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ start, end }),
                          });
                          return res.json();
                        })
                      }
                      disabled={actionPending === "confirm" || !slotStart || !slotEnd}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
                    >
                      {actionPending === "confirm" && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                      <CheckCircle2 className="mr-2 size-3.5" />
                      Confirm &amp; Lock Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stage 6-7: Consent Verification & Session Completion */}
            {booking.stage === "scheduled" && (
              <Card
                className={`shadow-xs ${
                  booking.consentSignedAt
                    ? "border-emerald-300 dark:border-emerald-900/60"
                    : "border-amber-400 bg-amber-50/10 dark:border-amber-900"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {booking.consentSignedAt ? (
                      <ShieldCheck className="size-5 text-emerald-600" />
                    ) : (
                      <ShieldAlert className="size-5 text-amber-600" />
                    )}
                    <CardTitle className="font-heading font-cormorant text-xl">
                      {booking.consentSignedAt
                        ? "Consent Verified · Ready for Completion"
                        : "Legal Consent Gate · Action Required"}
                    </CardTitle>
                  </div>
                  <CardDescription className="font-body text-xs">
                    {booking.consentSignedAt
                      ? `Digitally signed by ${booking.client.name} on ${format(
                          new Date(booking.consentSignedAt),
                          "MMM d, yyyy h:mm a"
                        )}.`
                      : "Client must digitally execute the medical & artistic consent before tattoo session marks complete."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!booking.consentSignedAt && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          callAction("consent", async () => {
                            const res = await fetch(`/api/bookings/${id}/consent`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                formUrl: `${window.location.origin}/consent/${id}`,
                              }),
                            });
                            return res.json();
                          })
                        }
                        disabled={actionPending === "consent"}
                        className="text-xs h-9"
                      >
                        {actionPending === "consent" && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                        <Send className="mr-2 size-3.5" />
                        Send Consent Link via WhatsApp
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => setShowOverrideDialog(true)}
                        className="text-xs h-9"
                      >
                        <ShieldAlert className="mr-2 size-3.5" />
                        Paper Consent Override
                      </Button>
                    </div>
                  )}

                  {booking.consentSignedAt && (
                    <Button
                      onClick={() =>
                        callAction("complete", async () => {
                          const res = await fetch(`/api/bookings/${id}/complete`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ durationMinutes: 60 }),
                          });
                          return res.json();
                        })
                      }
                      disabled={actionPending === "complete"}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 font-medium"
                    >
                      {actionPending === "complete" ? (
                        <Loader2 className="mr-2 size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 size-3.5" />
                      )}
                      Mark Session Complete &amp; Trigger Aftercare
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stage 8: Balance Payment */}
            {booking.stage === "session_complete" && (
              <Card className="border-teal-300 dark:border-teal-900/60 shadow-xs">
                <CardHeader>
                  <CardTitle className="font-heading font-cormorant text-xl">
                    Final Balance Settlement
                  </CardTitle>
                  <CardDescription className="font-body text-xs">
                    Generate the final balance invoice for tattoo completion.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        type="number"
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                        placeholder="7,000"
                        className="pl-7 h-10 font-mono text-sm"
                      />
                    </div>
                    <Button
                      onClick={() =>
                        callAction("balance", async () => {
                          const res = await fetch(`/api/bookings/${id}/balance-link`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ amount: Number(balanceAmount) * 100 }),
                          });
                          return res.json();
                        })
                      }
                      disabled={actionPending === "balance" || !balanceAmount}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-10 font-medium"
                    >
                      {actionPending === "balance" ? (
                        <Loader2 className="mr-2 size-3.5 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 size-3.5" />
                      )}
                      Send Balance Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stage 9-10: Follow-up & Healed Photos */}
            {booking.stage === "paid_in_full" && (
              <Card className="border-purple-300 dark:border-purple-900/60 shadow-xs">
                <CardHeader>
                  <CardTitle className="font-heading font-cormorant text-xl">
                    3-Week Healed Photo Check-in
                  </CardTitle>
                  <CardDescription className="font-body text-xs">
                    Dispatch an automated healed photo invitation and satisfaction review to {booking.client.name}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() =>
                      callAction("followup", async () => {
                        const res = await fetch(`/api/bookings/${id}/follow-up`, {
                          method: "POST",
                        });
                        return res.json();
                      })
                    }
                    disabled={actionPending === "followup"}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-10 font-medium"
                  >
                    {actionPending === "followup" ? (
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                    ) : (
                      <Send className="mr-2 size-3.5" />
                    )}
                    Send Healed Photo Request
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Interactive Comms Timeline */}
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="font-heading font-cormorant text-xl">
                  Client Communications &amp; Logs
                </CardTitle>
                <CardDescription className="font-body text-xs">
                  Automated notifications, WhatsApp exchanges, and client touchpoints.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {messages.length} events
              </Badge>
            </CardHeader>

            <CardContent className="space-y-4">
              {messages.length === 0 ? (
                <div className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
                  No automated or direct messages recorded yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-3.5 text-xs transition-all ${
                        m.direction === "inbound"
                          ? "border-l-4 border-l-[#C4FF61] bg-muted/40"
                          : "border-l-4 border-l-blue-500 bg-card"
                      }`}
                    >
                      <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[9px] uppercase tracking-wider font-semibold"
                          >
                            {m.channel}
                          </Badge>
                          <span className="capitalize font-medium text-foreground">
                            {m.direction === "inbound" ? "From Client" : "Studio Automated"}
                          </span>
                        </div>
                        <span className="font-mono text-[10px]">
                          {format(new Date(m.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap font-body text-foreground/90 leading-relaxed">
                        {m.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Fast Direct WhatsApp Composer */}
              <div className="pt-3 border-t space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Quick WhatsApp Dispatch
                </label>
                <Textarea
                  placeholder={`Write a direct WhatsApp message to ${booking.client.name}…`}
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={2}
                  className="text-xs font-body"
                />
                <Button
                  onClick={() =>
                    callAction("wa", async () => {
                      const res = await fetch(`/api/bookings/${id}/whatsapp`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ message: waMessage }),
                      });
                      if (res.ok) setWaMessage("");
                      return res.json();
                    })
                  }
                  disabled={actionPending === "wa" || !waMessage.trim()}
                  className="w-full bg-[#1A1A1A] hover:bg-black text-[#C4FF61] dark:bg-[#C4FF61] dark:text-[#1A1A1A] text-xs h-9 font-medium"
                >
                  {actionPending === "wa" ? (
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="mr-2 size-3.5" />
                  )}
                  Send via WhatsApp Cloud API
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Complete Client Profile Dossier (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Client Identity Dossier Card */}
          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-900 to-zinc-700 text-[#C4FF61] font-semibold text-lg ring-2 ring-[#C4FF61]/30">
                  {booking.client.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="font-heading font-cormorant text-2xl font-semibold">
                    {booking.client.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-body">
                    Registered Studio Client
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5 text-xs font-body">
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Email:</span>
                <a
                  href={`mailto:${booking.client.email}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {booking.client.email}
                </a>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-mono font-medium text-foreground">
                  {booking.client.phone}
                </span>
              </div>

              {intake.city && (
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">City:</span>
                  <span className="font-medium text-foreground inline-flex items-center gap-1">
                    <MapPin className="size-3 text-rose-500" />
                    {intake.city}
                  </span>
                </div>
              )}

              {intake.instagram && (
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Instagram:</span>
                  <a
                    href={`https://instagram.com/${intake.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-pink-600 hover:underline dark:text-pink-400 inline-flex items-center gap-1"
                  >
                    <Instagram className="size-3" />
                    @{intake.instagram}
                  </a>
                </div>
              )}

              {intake.timeline && (
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Desired Timeline:</span>
                  <span className="font-medium text-foreground bg-muted px-2 py-0.5 rounded">
                    {intake.timeline}
                  </span>
                </div>
              )}

              {intake.dob && (
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Date of Birth:</span>
                  <span className="font-mono text-foreground">{intake.dob}</span>
                </div>
              )}

              {intake.gender && (
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Gender:</span>
                  <span className="text-foreground">{intake.gender}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reference Designs Gallery */}
          {booking.referenceImages && booking.referenceImages.length > 0 && (
            <Card className="shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading font-cormorant text-xl">
                    Reference Designs
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {booking.referenceImages.length} images
                  </Badge>
                </div>
                <CardDescription className="text-xs font-body">
                  Uploaded by client during intake form submission.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2.5">
                  {booking.referenceImages.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveImageModal(img)}
                      className="group cursor-pointer relative aspect-square overflow-hidden rounded-lg border bg-muted shadow-xs transition-all hover:scale-105 hover:ring-2 hover:ring-[#C4FF61]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`Reference design ${idx + 1}`}
                        className="size-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <ExternalLink className="size-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tattoo Concept & Intake Brief */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading font-cormorant text-xl">
                Tattoo Brief &amp; Concept
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs font-body">
              {intake.design && (
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground block mb-1">
                    Design Concept
                  </span>
                  <div className="rounded-lg bg-muted/40 p-3 leading-relaxed whitespace-pre-wrap border border-border/50 text-foreground">
                    {intake.design}
                  </div>
                </div>
              )}

              {intake.notes && (
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground block mb-1">
                    Client Placement &amp; Story Notes
                  </span>
                  <div className="rounded-lg bg-muted/40 p-3 leading-relaxed whitespace-pre-wrap border border-border/50 text-foreground">
                    {intake.notes}
                  </div>
                </div>
              )}

              {booking.consultationNotes && (
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-600 block mb-1">
                    Artist Consultation Notes
                  </span>
                  <div className="rounded-lg bg-amber-50/40 dark:bg-amber-950/20 p-3 leading-relaxed whitespace-pre-wrap border border-amber-200/50 dark:border-amber-900/50 text-foreground">
                    {booking.consultationNotes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading font-cormorant text-xl">
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs font-body">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Deposit Requirement:</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatPaise(booking.depositAmount)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Remaining Balance:</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatPaise(booking.balanceAmount)}
                </span>
              </div>

              {payments.length > 0 && (
                <div className="mt-3 pt-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-2">
                    Payment Gateway Transactions
                  </span>
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg bg-muted/40 p-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="size-3 text-muted-foreground" />
                          <span className="capitalize font-medium">{p.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{formatPaise(p.amount)}</span>
                          <Badge
                            variant={p.status === "paid" ? "default" : "secondary"}
                            className="text-[9px]"
                          >
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Modal */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent className="font-body">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading font-cormorant text-2xl">
              Mark Booking as Not a Fit?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 py-2 text-xs text-muted-foreground">
            <p>
              This will update the booking stage to &quot;Not a Fit&quot; and notify the client courteously.
            </p>
            <Input
              placeholder="Reason for archiving (e.g. style conflict, full booking calendar)…"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="text-xs"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowRejectDialog(false);
                callAction("consultation", async () => {
                  const res = await fetch(`/api/bookings/${id}/consultation`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      status: "not_a_fit",
                      reason: rejectionReason,
                    }),
                  });
                  return res.json();
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
            >
              Confirm Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Consent Override Modal */}
      <AlertDialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <AlertDialogContent className="font-body">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-heading font-cormorant text-2xl text-destructive">
              <ShieldAlert className="size-5" />
              Documented Physical Consent Override
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 py-2 text-xs text-muted-foreground">
            <p>
              Digital consent has not been recorded online. To fulfill PRD Stage 6 safety compliance, you must record a mandatory justification (e.g. physical paper consent form executed on studio premises).
            </p>
            <Textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Physical paper consent form signed in studio and filed in physical studio binder..."
              rows={3}
              className="text-xs font-body"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowOverrideDialog(false)} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
              disabled={!overrideReason.trim() || actionPending === "complete"}
              onClick={() => {
                setShowOverrideDialog(false);
                callAction("complete", async () => {
                  const res = await fetch(`/api/bookings/${id}/complete`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      durationMinutes: 60,
                      consentOverrideReason: overrideReason.trim(),
                    }),
                  });
                  return res.json();
                });
              }}
            >
              Verify Override &amp; Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Lightbox Modal */}
      {activeImageModal && (
        <div
          onClick={() => setActiveImageModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm cursor-zoom-out"
        >
          <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-xl border border-white/20 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImageModal}
              alt="Full resolution tattoo reference"
              className="max-h-[85vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
