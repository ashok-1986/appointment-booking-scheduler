"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Loader2, Sparkles, UserCheck } from "lucide-react";
import { toast } from "sonner";

export function ScheduleSessionModal({
  isOpen,
  onClose,
  customerId,
  bookingId,
  customerName,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string;
  bookingId: string | null;
  customerName: string;
  onSuccess: () => Promise<void>;
}) {
  const [meetingType, setMeetingType] = useState<string>("tattoo_session");
  const [scheduledStart, setScheduledStart] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("180");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMeetingTypeChange = (val: string) => {
    setMeetingType(val);
    if (val === "consultation") {
      setDurationMinutes("60");
    } else if (val === "touch_up") {
      setDurationMinutes("60");
    } else if (val === "healed_review") {
      setDurationMinutes("30");
    } else {
      setDurationMinutes("180");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId && !customerId) {
      toast.error("Either select an existing client or choose a project first");
      return;
    }
    if (!scheduledStart) {
      toast.error("Please select appointment date and time");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/calendar/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingId || undefined,
          clientId: customerId || undefined,
          meetingType,
          sessionType: meetingType,
          scheduledStart,
          durationMinutes: Number(durationMinutes),
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to schedule session");
      }

      toast.success("Studio appointment scheduled & placed on calendar");
      await onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md font-body">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <Calendar className="size-5 text-[#C4FF61]" />
            Schedule Studio Appointment
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Client: <strong className="text-foreground">{customerName}</strong>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
          {/* Meeting / Session Type Selector */}
          <div>
            <label className="block font-medium text-foreground mb-1">
              Appointment / Meeting Type
            </label>
            <Select value={meetingType} onValueChange={handleMeetingTypeChange}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tattoo_session">Tattoo Session (Inking / Shading)</SelectItem>
                <SelectItem value="consultation">Design Consultation (Placement & Sizing)</SelectItem>
                <SelectItem value="touch_up">Touch-up Session (Healed Refinement)</SelectItem>
                <SelectItem value="healed_review">Healed Photo Review & Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">
              Appointment Date & Start Time
            </label>
            <Input
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              required
              className="text-xs h-9"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">
              Estimated Duration
            </label>
            <Select value={durationMinutes} onValueChange={setDurationMinutes}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes (Quick Review / Check-in)</SelectItem>
                <SelectItem value="60">1 hour (Consultation / Small Flash / Touch-up)</SelectItem>
                <SelectItem value="120">2 hours (Medium Piece)</SelectItem>
                <SelectItem value="180">3 hours (Half-Day Session)</SelectItem>
                <SelectItem value="240">4 hours (Extended Half-Day)</SelectItem>
                <SelectItem value="360">6 hours (Full-Day Sitting)</SelectItem>
                <SelectItem value="480">8 hours (Full-Day Large Scale)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">
              Appointment Focus & Notes (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Placement stencil review, shading background pass, or touch-up color..."
              className="min-h-[70px] text-xs resize-none"
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
              className="bg-[#C4FF61] text-[#1A1A1A] hover:bg-[#b2f048] font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Scheduling...
                </>
              ) : (
                "Confirm & Place on Calendar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
