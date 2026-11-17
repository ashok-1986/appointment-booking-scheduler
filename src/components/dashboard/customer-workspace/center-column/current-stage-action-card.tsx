"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  FileCheck2,
  Send,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Camera,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { normalizeToV1Stage, type V1BookingStage } from "@/lib/state-machine";

export function CurrentStageActionCard({
  booking,
  customer,
  onRefresh,
  onOpenScheduleModal,
  onOpenUploadModal,
}: {
  booking: any;
  customer: any;
  onRefresh: () => Promise<void>;
  onOpenScheduleModal: () => void;
  onOpenUploadModal: () => void;
}) {
  const currentStage: V1BookingStage = normalizeToV1Stage(booking.stage);

  const [depositAmount, setDepositAmount] = useState<string>(
    booking.depositAmount ? String(Number(booking.depositAmount) / 100) : "5000"
  );
  const [balanceAmount, setBalanceAmount] = useState<string>(
    booking.balanceAmount ? String(Number(booking.balanceAmount) / 100) : "15000"
  );
  const [isPending, setIsPending] = useState(false);

  // Advance Consultation to Qualified / Deposit Stage
  const handleApproveConsultation = async () => {
    setIsPending(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/consultation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "qualified" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to qualify enquiry");
      toast.success("Enquiry approved and qualified for deposit quote");
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to advance stage");
    } finally {
      setIsPending(false);
    }
  };

  // Generate Razorpay Deposit Link
  const handleCreateDepositLink = async () => {
    const num = Number(depositAmount);
    if (!num || num <= 0) {
      toast.error("Please enter a valid deposit amount in ₹");
      return;
    }
    setIsPending(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/deposit-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: num * 100 }), // paise
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to create deposit payment link");
      toast.success("Razorpay deposit link created & link logged to communications");
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create payment link");
    } finally {
      setIsPending(false);
    }
  };

  // Generate Razorpay Balance Link
  const handleCreateBalanceLink = async () => {
    const num = Number(balanceAmount);
    if (!num || num <= 0) {
      toast.error("Please enter a valid balance amount in ₹");
      return;
    }
    setIsPending(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/balance-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: num * 100 }), // paise
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to create balance link");
      toast.success("Remaining balance link created & link sent to client");
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create balance payment link");
    } finally {
      setIsPending(false);
    }
  };

  // Mark Session Complete
  const handleMarkSessionComplete = async () => {
    setIsPending(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to complete session");
      toast.success("Session completed and marked for balance settlement");
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete session");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-border/80 bg-card p-5 shadow-xs font-body">
      <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-[#C4FF61] animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Current Stage Actions
          </h3>
        </div>
        <Badge variant="outline" className="text-xs border-border/60">
          Stage: {currentStage}
        </Badge>
      </div>

      {/* Stage 1 & 2: New Enquiry & Consultation Review */}
      {(currentStage === "new_enquiry" || currentStage === "consultation_review") && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Review the client's tattoo concept, placement, and estimated budget. Once reviewed and accepted, qualify the enquiry to send a quote and deposit payment request.
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Button
              size="sm"
              onClick={handleApproveConsultation}
              disabled={isPending}
              className="bg-foreground text-background hover:bg-foreground/90 font-medium text-xs h-9 px-4"
            >
              {isPending ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <CheckCircle2 className="mr-2 size-3.5 text-[#C4FF61]" />}
              Qualify & Advance to Deposit Request
            </Button>
          </div>
        </div>
      )}

      {/* Stage 3: Deposit Pending */}
      {currentStage === "deposit_pending" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Generate and dispatch an official Razorpay deposit payment link. The link expires in 72 hours and is automatically tracked.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="relative w-44">
              <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">₹</span>
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Deposit amount"
                className="pl-7 h-9 text-xs"
              />
            </div>
            <Button
              size="sm"
              onClick={handleCreateDepositLink}
              disabled={isPending}
              className="bg-[#C4FF61] text-[#1A1A1A] hover:bg-[#b2f048] font-semibold text-xs h-9 px-4 shadow-xs"
            >
              {isPending ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <CreditCard className="mr-2 size-3.5" />}
              Create & Dispatch Deposit Link
            </Button>
          </div>
        </div>
      )}

      {/* Stage 4: Confirmed / Scheduled */}
      {currentStage === "confirmed_scheduled" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Deposit is confirmed. Ensure the appointment slot is scheduled on your calendar and prepare the digital consent waiver on the studio iPad before commencing needlework.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={onOpenScheduleModal}
              className="bg-foreground text-background hover:bg-foreground/90 text-xs h-9 px-4 font-medium"
            >
              <Calendar className="mr-2 size-3.5 text-[#C4FF61]" />
              Schedule Studio Session
            </Button>

            <a
              href={`/consent/${booking.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/80 px-3 py-2 text-xs font-medium hover:bg-muted/40 transition-colors"
            >
              <FileCheck2 className="size-3.5 text-blue-500" />
              Open iPad Consent Form
              <ExternalLink className="size-3 text-muted-foreground" />
            </a>

            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkSessionComplete}
              disabled={isPending}
              className="text-xs h-9 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              {isPending ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <CheckCircle2 className="mr-2 size-3.5 text-emerald-500" />}
              Mark Tattoo Session Completed
            </Button>
          </div>
        </div>
      )}

      {/* Stage 5 & 6: Session Completed & Payment Pending */}
      {(currentStage === "session_completed" || currentStage === "payment_pending") && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tattoo session completed. Capture and archive high-resolution fresh studio photographs, then request the final balance payment.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={onOpenUploadModal}
              className="bg-foreground text-background hover:bg-foreground/90 text-xs h-9 px-4"
            >
              <Camera className="mr-2 size-3.5 text-[#C4FF61]" />
              Upload Fresh Session Photos
            </Button>

            <div className="relative w-40">
              <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">₹</span>
              <Input
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="Balance amount"
                className="pl-7 h-9 text-xs"
              />
            </div>

            <Button
              size="sm"
              onClick={handleCreateBalanceLink}
              disabled={isPending}
              className="bg-[#C4FF61] text-[#1A1A1A] hover:bg-[#b2f048] font-semibold text-xs h-9 px-4 shadow-xs"
            >
              {isPending ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <CreditCard className="mr-2 size-3.5" />}
              Send Balance Link
            </Button>
          </div>
        </div>
      )}

      {/* Stage 7: Closed / Follow-up */}
      {currentStage === "closed_followup" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Payment settled and tattoo appointment finalized. Dispatch tailored aftercare guides and request healed photographs after the 4-6 week recovery window.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={onOpenUploadModal}
              className="bg-foreground text-background hover:bg-foreground/90 text-xs h-9 px-4"
            >
              <Camera className="mr-2 size-3.5 text-purple-400" />
              Upload Healed Photos
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
