"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, PhoneCall, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function LogCallModal({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  onLogCall,
}: {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone: string;
  onLogCall: (content: string) => Promise<void>;
}) {
  const [outcome, setOutcome] = useState("Connected");
  const [callNotes, setCallNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cleanPhone = customerPhone.replace(/[^0-9]/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const summary = `Phone Call (${outcome}): ${callNotes.trim() || "No additional notes"}`;
      await onLogCall(summary);
      toast.success("Call outcome logged to timeline");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to log call");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md font-body">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <PhoneCall className="size-5 text-amber-500" />
            Call {customerName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 p-3">
            <div>
              <span className="text-xs font-semibold text-foreground block">Client Phone</span>
              <span className="text-xs text-muted-foreground">+{cleanPhone}</span>
            </div>
            <a
              href={`tel:+${cleanPhone}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-600 transition-colors"
            >
              <Phone className="size-3" /> Dial Now <ExternalLink className="size-2.5" />
            </a>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">
              Call Outcome
            </label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select call outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Connected">Connected & Discussed</SelectItem>
                <SelectItem value="Left Voicemail">Left Voicemail / Audio Note</SelectItem>
                <SelectItem value="No Answer">No Answer</SelectItem>
                <SelectItem value="Scheduled Callback">Scheduled Callback Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">
              Call Discussion Notes
            </label>
            <Textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              placeholder="e.g. Confirmed placement on outer bicep, agreed to deposit next Friday..."
              className="min-h-[80px] text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-foreground text-background hover:bg-foreground/90 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Logging...
                </>
              ) : (
                "Save Call to Timeline"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
