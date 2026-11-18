import { requireUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { bookings, clients, bookingSessions, payments } from "@/lib/schema";
import { desc, eq, gte, lte, and, ne, isNull } from "drizzle-orm";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Flame,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Camera,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const user = await requireUser();

  // 1. Fetch all bookings with clients
  const allBookings = await db.query.bookings.findMany({
    with: { client: true },
    orderBy: [desc(bookings.createdAt)],
  });

  // 2. Fetch upcoming sessions for the next 7 days
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 3600_000);

  const upcomingSessions = await db.query.bookingSessions.findMany({
    where: and(
      gte(bookingSessions.scheduledStart, now),
      lte(bookingSessions.scheduledStart, nextWeek),
      ne(bookingSessions.status, "cancelled")
    ),
    with: {
      booking: {
        with: { client: true },
      },
    },
    orderBy: [bookingSessions.scheduledStart],
    limit: 6,
  });

  // 3. Compute KPI Metrics
  const newEnquiries = allBookings.filter(
    (b) => b.stage === "enquiry" || b.stage === "in_consultation"
  );

  const pendingDeposits = allBookings.filter(
    (b) => b.stage === "deposit_pending" || b.stage === "deposit_requested"
  );

  const scheduledBookings = allBookings.filter(
    (b) => b.stage === "scheduled" || b.stage === "deposit_paid"
  );

  const completedBookings = allBookings.filter(
    (b) => b.stage === "session_complete" || b.stage === "follow_up_completed"
  );

  // Sum pending deposits in INR (only actual configured deposits)
  const pendingDepositSumPaise = pendingDeposits.reduce((acc, b) => {
    return acc + (b.depositAmount ? Number(b.depositAmount) : 0);
  }, 0);
  const pendingDepositSumINR = Math.round(pendingDepositSumPaise / 100);

  // Helper to extract session type
  const getMeetingTypeBadge = (notes?: string | null) => {
    const text = notes || "";
    if (text.includes("[Consultation]")) {
      return <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-500 text-[10px]">Consultation</Badge>;
    }
    if (text.includes("[Touch-up]")) {
      return <Badge variant="outline" className="border-cyan-400/40 bg-cyan-400/10 text-cyan-500 text-[10px]">Touch-up</Badge>;
    }
    if (text.includes("[Healed Review]")) {
      return <Badge variant="outline" className="border-purple-400/40 bg-purple-400/10 text-purple-500 text-[10px]">Healed Review</Badge>;
    }
    return <Badge variant="outline" className="border-[#C4FF61]/40 bg-[#C4FF61]/10 text-zinc-900 dark:text-[#C4FF61] text-[10px]">Tattoo Session</Badge>;
  };

  return (
    <div className="space-y-8 font-montserrat">
      {/* ------------------------------------------------------------- */}
      {/* TOP WELCOME BANNER & STUDIO PULSE */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-cormorant text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
              Artist Command Center
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4FF61]/40 bg-[#C4FF61]/10 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-900 dark:text-[#C4FF61]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C4FF61]" />
              Live Studio
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Welcome back, {user.name}. Here is what is happening across your private tattoo studio today.
          </p>
        </div>

        {/* Quick Link Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/bookings"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-xs hover:bg-accent transition-colors gap-1.5"
          >
            <span>Pipeline Kanban</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/dashboard/calendar"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-xs hover:bg-accent transition-colors gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Studio Calendar</span>
          </Link>
          <Link
            href="/enquiry"
            target="_blank"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#C4FF61] hover:bg-[#EAFF27] px-3.5 text-xs font-semibold text-[#1A1A1A] shadow-xs transition-colors gap-1.5"
          >
            <span>Live Enquiry Form</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4 BENTO KPI CARDS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: New Enquiries */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-amber-400/50">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">New Enquiries</span>
            <div className="rounded-lg bg-amber-400/10 p-2 text-amber-500">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-montserrat text-3xl font-bold tracking-tight text-foreground">
              {newEnquiries.length}
            </span>
            <span className="text-xs text-muted-foreground">waiting for review</span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {newEnquiries.length > 0 ? "Leads requesting consultation" : "All new enquiries reviewed"}
          </p>
        </div>

        {/* Card 2: Upcoming Sessions */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-[#C4FF61]/50">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">This Week's Sessions</span>
            <div className="rounded-lg bg-[#C4FF61]/10 p-2 text-[#C4FF61]">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-montserrat text-3xl font-bold tracking-tight text-foreground">
              {upcomingSessions.length}
            </span>
            <span className="text-xs text-muted-foreground">booked slots</span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Consultations & in-studio tattoo sessions
          </p>
        </div>

        {/* Card 3: Pending Deposits */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-cyan-400/50">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Deposits</span>
            <div className="rounded-lg bg-cyan-400/10 p-2 text-cyan-500">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-montserrat text-3xl font-bold tracking-tight text-foreground">
              ₹{pendingDepositSumINR.toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-muted-foreground">({pendingDeposits.length} links)</span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Awaiting Razorpay confirmation
          </p>
        </div>

        {/* Card 4: Completed Tattoos */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-emerald-400/50">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Projects</span>
            <div className="rounded-lg bg-emerald-400/10 p-2 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-montserrat text-3xl font-bold tracking-tight text-foreground">
              {completedBookings.length}
            </span>
            <span className="text-xs text-muted-foreground">archived tattoos</span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Ready for 14-day healed photo follow-up
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TWO COLUMN WORKSPACE: UPCOMING APPOINTMENTS & RECENT LEADS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2/3): Upcoming Studio Schedule */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card: Upcoming Schedule */}
          <div className="rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#C4FF61]" />
                <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
                  Upcoming Studio Schedule (Next 7 Days)
                </h2>
              </div>
              <Link
                href="/dashboard/calendar"
                className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <span>View Full Calendar</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="p-5">
              {upcomingSessions.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="font-medium">No sessions scheduled in the next 7 days.</p>
                  <Link
                    href="/dashboard/calendar"
                    className="mt-2 inline-block text-xs font-semibold text-[#C4FF61] hover:underline"
                  >
                    + Book a Session Slot on Calendar
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {upcomingSessions.map((s) => {
                    const client = s.booking?.client;
                    const isConsentSigned = s.consentStatus === "signed" || !!s.booking?.consentSignedAt;
                    const dateObj = new Date(s.scheduledStart);

                    return (
                      <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          {/* Date box */}
                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-muted/40 text-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">
                              {dateObj.toLocaleDateString("en-US", { month: "short" })}
                            </span>
                            <span className="text-base font-bold text-foreground leading-none">
                              {dateObj.getDate()}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {client?.name || "Private Client"}
                              </span>
                              {getMeetingTypeBadge(s.notes)}
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} ({s.durationMinutes}m)
                              </span>
                              <span>•</span>
                              <span>{s.booking?.serviceType || "Tattoo"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {isConsentSigned ? (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Consent Signed
                            </Badge>
                          ) : (
                            <Link
                              href={`/consent/${s.bookingId}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 hover:underline"
                            >
                              <FileCheck2 className="h-3 w-3" />
                              <span>Sign on iPad</span>
                            </Link>
                          )}

                          <Link
                            href={`/dashboard/bookings/${s.bookingId}`}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-xs font-medium text-foreground hover:bg-accent"
                          >
                            Dossier
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card: Recent Enquiries */}
          <div className="rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
                  Recent Inflow & Enquiries
                </h2>
              </div>
              <Link
                href="/dashboard/bookings"
                className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <span>View All Inflows</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="p-5">
              {newEnquiries.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No pending enquiries. Share your live link on Instagram to accept new collectors.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {newEnquiries.slice(0, 5).map((b) => (
                    <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {b.client?.name || "Prospective Client"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({b.client?.phone || b.client?.email})
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {b.designDescription || "No design description provided."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/dashboard/bookings/${b.id}`}
                          className="inline-flex h-8 items-center justify-center rounded-lg bg-foreground text-background px-3 text-xs font-semibold hover:opacity-90 transition-opacity gap-1"
                        >
                          <span>Review & Schedule</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Quick Tools & Studio Operations */}
        <div className="space-y-6">
          {/* Quick Studio Tools */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-semibold tracking-tight text-foreground border-b border-border pb-2.5">
              Quick Studio Actions
            </h3>

            <div className="space-y-2 text-xs">
              <Link
                href="/dashboard/gallery"
                className="flex items-center justify-between p-3 rounded-xl border border-border/80 hover:border-[#C4FF61] bg-muted/20 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#C4FF61]/10 text-zinc-900 dark:text-[#C4FF61]">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block">Upload Tattoo Photos</span>
                    <span className="text-[11px] text-muted-foreground">Fresh inked, healed, or touch-ups</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </Link>

              <Link
                href="/dashboard/customers"
                className="flex items-center justify-between p-3 rounded-xl border border-border/80 hover:border-[#C4FF61] bg-muted/20 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-500">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block">Client 360 Directory</span>
                    <span className="text-[11px] text-muted-foreground">Full tattoo histories & medical forms</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </Link>

              <Link
                href="/dashboard/calendar"
                className="flex items-center justify-between p-3 rounded-xl border border-border/80 hover:border-[#C4FF61] bg-muted/20 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-400/10 text-cyan-500">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block">Manage Calendar Slots</span>
                    <span className="text-[11px] text-muted-foreground">Artist-controlled appointment books</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
            </div>
          </div>

          {/* Pipeline Distribution Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-semibold tracking-tight text-foreground border-b border-border pb-2.5">
              Pipeline Stage Breakdown
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">1. New Enquiries</span>
                <span className="font-semibold text-foreground">{newEnquiries.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">2. Deposit Pending</span>
                <span className="font-semibold text-foreground">{pendingDeposits.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">3. Confirmed & Scheduled</span>
                <span className="font-semibold text-foreground">{scheduledBookings.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">4. Completed Tattoos</span>
                <span className="font-semibold text-foreground">{completedBookings.length}</span>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between font-bold">
                <span className="text-foreground">Total Lifetime Projects</span>
                <span className="text-[#C4FF61]">{allBookings.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
