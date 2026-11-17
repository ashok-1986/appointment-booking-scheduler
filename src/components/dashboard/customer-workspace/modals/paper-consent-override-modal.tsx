"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, Loader2, CheckSquare } from "lucide-react";
import { toast } from "sonner";

export function PaperConsentOverrideModal({
  isOpen,
  onClose,
  bookingId,
  customerName,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string | null;
  customerName: string;
  onSuccess: () => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) {
      toast.error("Please select an active tattoo project");
      return;
    }
    if (!confirmedAge) {
      toast.error("You must confirm client age verification (18+)");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide an override explanation");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/consent/${bookingId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: customerName,
          clientEmail: "studio@meetprerna.com",
          signatureDataUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><text y='20'>PHYSICAL_PAPER_OVERRIDE</text></svg>",
          answers: {
            paperOverride: true,
            overrideReason: reason.trim(),
            confirmed18Plus: true,
          },
          consentProcedure: true,
          consentPhoto: true,
          consentMarketing: false,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to log paper override");
      }

      toast.success("Physical paper consent verified and recorded");
      await onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to log override");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md font-body">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-5" />
            Physical Paper Waiver Override
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Record a physical ink-and-paper consent form signed on studio premises for {customerName}.
          </p>

          <div>
            <label className="block font-medium text-foreground mb-1">
              Reason for Physical Waiver
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. iPad battery depleted during session, customer preferred physical paper..."
              required
              className="min-h-[70px] text-xs resize-none"
            />
          </div>

          <label className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/30 p-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmedAge}
              onChange={(e) => setConfirmedAge(e.target.checked)}
              className="mt-0.5 size-4 rounded border-border"
            />
            <span className="text-[11px] leading-tight text-foreground">
              I verify that {customerName} presented valid government photo ID confirming age 18+ and completed all medical questions on the paper waiver.
            </span>
          </label>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !confirmedAge || !reason.trim()}
              className="bg-amber-600 text-white hover:bg-amber-700 font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Verifying...
                </>
              ) : (
                "Certify & Record Override"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
