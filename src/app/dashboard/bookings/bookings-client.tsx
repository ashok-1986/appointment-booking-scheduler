"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Filter,
  Instagram,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  depositAmount: string | null;
  balanceAmount: string | null;
  depositPaidAt: string | null;
  balancePaidAt: string | null;
  consentSignedAt: string | null;
  followUpRating: number | null;
  createdAt: string;
  client: { id: string; name: string; email: string; phone: string };
};

const STAGE_LABELS: Record<Stage, string> = {
  enquiry: "Enquiry Received",
  in_consultation: "In Consultation",
  qualified: "Qualified",
  not_a_fit: "Not a Fit",
  deposit_requested: "Deposit Requested",
  deposit_pending: "Deposit Pending",
  deposit_paid: "Deposit Paid",
  scheduled: "Session Scheduled",
  session_complete: "Session Complete",
  paid_in_full: "Paid in Full",
  follow_up_sent: "Follow-up Sent",
  follow_up_completed: "Follow-up Done",
};

const STAGE_CONFIG: Record<
  Stage,
  { label: string; dotColor: string; badgeStyle: string; phase: string }
> = {
  enquiry: {
    label: "Enquiry",
    dotColor: "bg-sky-500",
    badgeStyle: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    phase: "intake",
  },
  in_consultation: {
    label: "In Consultation",
    dotColor: "bg-amber-500",
    badgeStyle: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    phase: "intake",
  },
  qualified: {
    label: "Qualified",
    dotColor: "bg-violet-500",
    badgeStyle: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    phase: "intake",
  },
  not_a_fit: {
    label: "Not a Fit",
    dotColor: "bg-zinc-400",
    badgeStyle: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800",
    phase: "not_a_fit",
  },
  deposit_requested: {
    label: "Deposit Requested",
    dotColor: "bg-orange-500",
    badgeStyle: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    phase: "deposit",
  },
  deposit_pending: {
    label: "Deposit Pending",
    dotColor: "bg-yellow-500",
    badgeStyle: "bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    phase: "deposit",
  },
  deposit_paid: {
    label: "Deposit Paid",
    dotColor: "bg-[#C4FF61]",
    badgeStyle: "bg-[#C4FF61]/20 text-emerald-800 dark:text-[#C4FF61] border-emerald-300 dark:border-[#C4FF61]/30",
    phase: "deposit",
  },
  scheduled: {
    label: "Scheduled",
    dotColor: "bg-blue-500",
    badgeStyle: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    phase: "session",
  },
  session_complete: {
    label: "Session Complete",
    dotColor: "bg-teal-500",
    badgeStyle: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    phase: "session",
  },
  paid_in_full: {
    label: "Paid in Full",
    dotColor: "bg-emerald-500",
    badgeStyle: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    phase: "session",
  },
  follow_up_sent: {
    label: "Follow-up Sent",
    dotColor: "bg-purple-500",
    badgeStyle: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    phase: "aftercare",
  },
  follow_up_completed: {
    label: "Follow-up Done",
    dotColor: "bg-indigo-500",
    badgeStyle: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    phase: "aftercare",
  },
};

const PHASES = [
  { key: "all", label: "All Bookings" },
  { key: "intake", label: "Leads & Intake" },
  { key: "deposit", label: "Deposits" },
  { key: "session", label: "Studio Sessions" },
  { key: "aftercare", label: "Aftercare" },
  { key: "not_a_fit", label: "Not a Fit" },
];

const STAGES: Stage[] = [
  "enquiry",
  "in_consultation",
  "qualified",
  "deposit_requested",
  "deposit_pending",
  "deposit_paid",
  "scheduled",
  "session_complete",
  "paid_in_full",
  "follow_up_sent",
  "follow_up_completed",
  "not_a_fit",
];

export default function BookingsClient({
  initialBookings = [],
}: {
  initialBookings?: Booking[];
}) {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [loading, setLoading] = useState(initialBookings.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  // Sync if initialBookings changes
  useEffect(() => {
    if (initialBookings.length > 0) {
      setBookings(initialBookings);
      setLoading(false);
    }
  }, [initialBookings]);

  // Phase and stage filter state
  const [selectedPhase, setSelectedPhase] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");

  const stageParam = searchParams.get("stage");

  useEffect(() => {
    if (stageParam && stageParam !== "all") {
      setSelectedStage(stageParam);
      const conf = STAGE_CONFIG[stageParam as Stage];
      if (conf) {
        setSelectedPhase(conf.phase);
      }
    }
  }, [stageParam]);

  const load = useCallback(async (silent = false) => {
    if (!silent && bookings.length === 0) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/bookings");
      if (!res.ok) {
        console.warn("fetch /api/bookings returned status:", res.status);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setBookings(data);
      }
    } catch (err: any) {
      console.error("Failed to refresh bookings:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookings.length]);

  useEffect(() => {
    if (initialBookings.length === 0) {
      load();
    }
  }, [load, initialBookings.length]);

  // Counts calculation
  const countsByStage = useMemo(() => {
    return bookings.reduce((acc, b) => {
      acc[b.stage] = (acc[b.stage] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [bookings]);

  const countsByPhase = useMemo(() => {
    const acc: Record<string, number> = {
      all: bookings.length,
      intake: 0,
      deposit: 0,
      session: 0,
      aftercare: 0,
      not_a_fit: 0,
    };
    for (const b of bookings) {
      const phase = STAGE_CONFIG[b.stage]?.phase;
      if (phase && acc[phase] !== undefined) {
        acc[phase]++;
      }
    }
    return acc;
  }, [bookings]);

  // Metrics for Bento Grid
  const metrics = useMemo(() => {
    const total = bookings.length;
    const needsReview = bookings.filter(
      (b) => b.stage === "enquiry" || b.stage === "in_consultation"
    ).length;
    const awaitingDeposit = bookings.filter(
      (b) => b.stage === "deposit_requested" || b.stage === "deposit_pending"
    ).length;
    const confirmedSessions = bookings.filter(
      (b) => b.stage === "deposit_paid" || b.stage === "scheduled"
    ).length;
    return { total, needsReview, awaitingDeposit, confirmedSessions };
  }, [bookings]);

  // Filter bookings
  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      // Stage specific filter
      if (selectedStage !== "all" && b.stage !== selectedStage) {
        return false;
      }
      // Phase filter
      if (selectedPhase !== "all") {
        const itemPhase = STAGE_CONFIG[b.stage]?.phase;
        if (itemPhase !== selectedPhase) return false;
      }
      // Search query
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const client = b.client;
        const matchesClient =
          client.name.toLowerCase().includes(q) ||
          client.email.toLowerCase().includes(q) ||
          client.phone.includes(q) ||
          b.serviceType.toLowerCase().includes(q);
        
        const intake = parseBookingDetails(b.designDescription);
        const matchesIntake =
          (intake.city && intake.city.toLowerCase().includes(q)) ||
          (intake.instagram && intake.instagram.toLowerCase().includes(q)) ||
          (intake.timeline && intake.timeline.toLowerCase().includes(q)) ||
          (intake.design && intake.design.toLowerCase().includes(q));

        return matchesClient || matchesIntake;
      }
      return true;
    });
  }, [bookings, selectedPhase, selectedStage, query]);

  return (
    <div className="space-y-8 font-body">
      {/* Editorial Luxury Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block size-2 rounded-full bg-[#C4FF61] animate-pulse" />
            <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground font-body">
              Prerna&apos;s Studio Command
            </span>
          </div>
          <h1 className="font-heading font-cormorant text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Bespoke Client Bookings
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl font-body">
            Manage your full appointment lifecycle from initial artistic intake to aftercare and healed photo archives.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/enquiry" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-dashed border-[#C4FF61]/60 hover:border-[#C4FF61] hover:bg-[#C4FF61]/10 text-xs font-medium"
            >
              <span>Preview Intake Form</span>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
            className="gap-1.5 text-xs font-medium"
            aria-label="Refresh bookings"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Bento Grid Metrics Overview */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Metric 1 */}
        <div
          onClick={() => {
            setSelectedPhase("all");
            setSelectedStage("all");
          }}
          className={`cursor-pointer group relative overflow-hidden rounded-xl border p-4 sm:p-5 transition-all duration-200 ${
            selectedPhase === "all" && selectedStage === "all"
              ? "border-[#C4FF61] bg-[#C4FF61]/5 shadow-sm"
              : "bg-card hover:border-border/80 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Total Inflow
            </span>
            <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 group-hover:scale-105 transition-transform">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
              {metrics.total}
            </span>
            <span className="text-xs text-muted-foreground font-body">enquiries logged</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground font-body">
            <span>View complete registry</span>
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div
          onClick={() => {
            setSelectedPhase("intake");
            setSelectedStage("all");
          }}
          className={`cursor-pointer group relative overflow-hidden rounded-xl border p-4 sm:p-5 transition-all duration-200 ${
            selectedPhase === "intake"
              ? "border-amber-400 bg-amber-500/5 shadow-sm"
              : "bg-card hover:border-border/80 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Needs Review
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <Sparkles className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
              {metrics.needsReview}
            </span>
            <span className="text-xs text-muted-foreground font-body">leads in intake</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-body">
            <span>Enquiries &amp; consultations</span>
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div
          onClick={() => {
            setSelectedPhase("deposit");
            setSelectedStage("all");
          }}
          className={`cursor-pointer group relative overflow-hidden rounded-xl border p-4 sm:p-5 transition-all duration-200 ${
            selectedPhase === "deposit"
              ? "border-orange-400 bg-orange-500/5 shadow-sm"
              : "bg-card hover:border-border/80 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Deposit Stage
            </span>
            <div className="rounded-lg bg-orange-500/10 p-2 text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform">
              <CreditCard className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
              {countsByPhase.deposit}
            </span>
            <span className="text-xs text-muted-foreground font-body">invoicing phase</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400 font-body">
            <span>{metrics.awaitingDeposit} awaiting payment</span>
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div
          onClick={() => {
            setSelectedPhase("session");
            setSelectedStage("all");
          }}
          className={`cursor-pointer group relative overflow-hidden rounded-xl border p-4 sm:p-5 transition-all duration-200 ${
            selectedPhase === "session"
              ? "border-[#C4FF61] bg-[#C4FF61]/5 shadow-sm"
              : "bg-card hover:border-border/80 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Studio Sessions
            </span>
            <div className="rounded-lg bg-[#C4FF61]/20 p-2 text-emerald-700 dark:text-[#C4FF61] group-hover:scale-105 transition-transform">
              <Calendar className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
              {countsByPhase.session}
            </span>
            <span className="text-xs text-muted-foreground font-body">active or completed</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-[#C4FF61] font-body">
            <span>{metrics.confirmedSessions} booked sessions</span>
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filtering */}
      <div className="space-y-4">
        {/* Lifecycle Phase Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {PHASES.map((phase) => {
            const count = countsByPhase[phase.key] ?? 0;
            const active = selectedPhase === phase.key;
            return (
              <button
                key={phase.key}
                onClick={() => {
                  setSelectedPhase(phase.key);
                  setSelectedStage("all");
                }}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                  active
                    ? "bg-[#1A1A1A] text-white shadow-sm ring-1 ring-[#C4FF61]/50 dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{phase.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                    active
                      ? "bg-[#C4FF61] text-[#1A1A1A] dark:bg-zinc-800 dark:text-zinc-100"
                      : "bg-muted-foreground/15 text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Exact Stage Selector */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by client name, city, instagram, timeline, phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-9 h-10 text-xs font-body rounded-lg bg-card"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Stage:</span>
            </div>
            <Select
              value={selectedStage}
              onValueChange={(val) => {
                setSelectedStage(val);
                if (val !== "all") {
                  const conf = STAGE_CONFIG[val as Stage];
                  if (conf) setSelectedPhase(conf.phase);
                }
              }}
            >
              <SelectTrigger className="h-10 w-48 text-xs font-body rounded-lg bg-card">
                <SelectValue placeholder="All 12 Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="font-medium">All 12 Stages</span>
                </SelectItem>
                {STAGES.map((s) => {
                  const conf = STAGE_CONFIG[s];
                  return (
                    <SelectItem key={s} value={s} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${conf.dotColor}`} />
                        <span>{conf.label}</span>
                        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                          ({countsByStage[s] ?? 0})
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {(selectedStage !== "all" || selectedPhase !== "all" || query) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPhase("all");
                  setSelectedStage("all");
                  setQuery("");
                }}
                className="h-10 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/30"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <FileText className="size-8 text-muted-foreground/60" />
            </div>
            <h3 className="font-heading font-cormorant text-xl font-medium text-foreground">
              No Bookings Found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4 font-body">
              {query || selectedStage !== "all" || selectedPhase !== "all"
                ? "No client records match the current filters. Try resetting search criteria."
                : "No enquiries have arrived yet. Share your studio intake link to begin collecting bespoke requests."}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPhase("all");
                  setSelectedStage("all");
                  setQuery("");
                  load(true);
                }}
                className="text-xs font-body"
              >
                <RefreshCw className="mr-1.5 size-3.5" />
                Reset &amp; Reload
              </Button>
              <Link href="/enquiry" target="_blank">
                <Button size="sm" className="bg-[#1A1A1A] hover:bg-black text-[#C4FF61] text-xs font-body">
                  Open Live Intake Form
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const intake = parseBookingDetails(b.designDescription);
            const stageConfig = STAGE_CONFIG[b.stage] ?? {
              label: STAGE_LABELS[b.stage] ?? b.stage,
              dotColor: "bg-zinc-400",
              badgeStyle: "bg-zinc-100 text-zinc-700",
              phase: "intake",
            };

            // Format timeline badge color
            let timelineBadgeStyle = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
            if (intake.timeline?.includes("ASAP")) {
              timelineBadgeStyle = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold";
            } else if (intake.timeline?.includes("1–2 Months") || intake.timeline?.includes("1-2 Months")) {
              timelineBadgeStyle = "bg-[#C4FF61]/20 text-emerald-800 dark:text-[#C4FF61]";
            }

            // WhatsApp link helper
            const cleanPhone = b.client.phone.replace(/[^0-9]/g, "");
            const waUrl = cleanPhone
              ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                  `Hi ${b.client.name}, this is Prerna from Meet Prerna Tattoo Studio regarding your enquiry!`
                )}`
              : null;

            return (
              <Card
                key={b.id}
                className="group relative overflow-hidden transition-all duration-200 hover:border-border hover:shadow-md"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Client Identity & Monogram */}
                    <div className="flex items-start gap-3.5">
                      <div className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-900 to-zinc-700 text-[#C4FF61] font-semibold text-lg ring-2 ring-[#C4FF61]/30">
                        {b.client.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/bookings/${b.id}`}
                            className="font-heading font-cormorant text-2xl font-semibold text-foreground hover:text-primary transition-colors tracking-tight"
                          >
                            {b.client.name}
                          </Link>
                          
                          {/* Service Type Chip */}
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground font-body">
                            {b.serviceType}
                          </span>
                        </div>

                        {/* Client metadata chips */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-body">
                          <span className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300" title={`UTC: ${new Date(b.createdAt).toISOString()}`}>
                            <Clock className="size-3 text-muted-foreground/70" />
                            <span>{new Date(b.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST</span>
                            <span className="text-zinc-400 font-normal">({formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })})</span>
                          </span>

                          {intake.city && (
                            <span className="flex items-center gap-1 font-medium text-foreground/80">
                              <MapPin className="size-3 text-rose-500" />
                              {intake.city}
                            </span>
                          )}

                          {intake.instagram && (
                            <a
                              href={`https://instagram.com/${intake.instagram}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-pink-600 hover:underline dark:text-pink-400"
                            >
                              <Instagram className="size-3" />
                              @{intake.instagram}
                            </a>
                          )}

                          {intake.timeline && (
                            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${timelineBadgeStyle}`}>
                              <span>Timeline:</span>
                              <span className="font-medium">{intake.timeline}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Stage Status Badge */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <Badge
                        variant="outline"
                        className={`gap-1.5 px-3 py-1 text-xs font-medium font-body ${stageConfig.badgeStyle}`}
                      >
                        <span className={`size-2 rounded-full ${stageConfig.dotColor}`} />
                        <span>{stageConfig.label}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-2 space-y-4">
                  {/* Concept / Intake snippet */}
                  {(intake.design || intake.notes) && (
                    <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground/90 font-body border border-border/40">
                      <p className="line-clamp-2">
                        <span className="font-semibold text-foreground">Intake Concept: </span>
                        {intake.design || intake.notes}
                      </p>
                    </div>
                  )}

                  {/* Reference photos preview if any */}
                  {b.referenceImages && b.referenceImages.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider font-body">
                        Ref Designs:
                      </span>
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {b.referenceImages.slice(0, 3).map((img, idx) => (
                          <a
                            key={idx}
                            href={img}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative size-10 shrink-0 overflow-hidden rounded-md border bg-muted shadow-xs transition-transform hover:scale-105 hover:ring-2 hover:ring-[#C4FF61]"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="Tattoo reference" className="size-full object-cover" />
                          </a>
                        ))}
                        {b.referenceImages.length > 3 && (
                          <span className="flex size-10 items-center justify-center rounded-md border bg-muted text-[11px] font-mono font-medium text-muted-foreground">
                            +{b.referenceImages.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bottom Strip: Financials, Schedule, Consent & Action CTAs */}
                  <div className="flex flex-col gap-3 pt-2 border-t border-border/50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-body text-muted-foreground">
                      {/* Session Date */}
                      {b.sessionDate ? (
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          <Calendar className="size-3.5 text-blue-500" />
                          Session: {format(new Date(b.sessionDate), "MMM d, yyyy h:mm a")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground/70">
                          <Calendar className="size-3.5" />
                          Session not yet booked
                        </span>
                      )}

                      {/* Deposit figure */}
                      {b.depositAmount && (
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="size-3.5 text-emerald-600 dark:text-[#C4FF61]" />
                          <span>Deposit: </span>
                          <span className="font-mono font-semibold text-foreground">
                            {formatPaise(b.depositAmount)}
                          </span>
                        </span>
                      )}

                      {/* Consent status */}
                      <span className="flex items-center gap-1">
                        {b.consentSignedAt ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <ShieldCheck className="size-3.5" />
                            Consent Signed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <ShieldAlert className="size-3.5" />
                            Consent Pending
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 transition-colors"
                          title="Open WhatsApp chat with client"
                        >
                          <MessageCircle className="size-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      )}

                      <Link href={`/dashboard/bookings/${b.id}`}>
                        <Button
                          size="sm"
                          className="h-9 gap-1.5 bg-[#1A1A1A] hover:bg-black text-[#C4FF61] dark:bg-[#C4FF61] dark:hover:bg-[#C4FF61]/90 dark:text-[#1A1A1A] text-xs font-medium transition-all font-body"
                        >
                          <span>Manage Dossier</span>
                          <ArrowRight className="size-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
