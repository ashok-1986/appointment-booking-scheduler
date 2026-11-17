"use client";

import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, ChevronRight, Layers } from "lucide-react";
import { normalizeToV1Stage, V1_STAGE_LABELS } from "@/lib/state-machine";

export function TattooProjectsSwitcher({
  bookings,
  activeBookingId,
  onSelectBooking,
}: {
  bookings: any[];
  activeBookingId: string | null;
  onSelectBooking: (id: string) => void;
}) {
  if (bookings.length <= 1) return null;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs font-body">
      <div className="mb-2.5 flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5">
          <Layers className="size-3.5 text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Client Projects ({bookings.length})
          </h3>
        </div>
      </div>

      <div className="space-y-1.5">
        {bookings.map((b) => {
          const isActive = b.id === activeBookingId;
          const stage = normalizeToV1Stage(b.stage);
          const stageLabel = V1_STAGE_LABELS[stage as keyof typeof V1_STAGE_LABELS] || stage;

          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelectBooking(b.id)}
              className={`w-full flex items-center justify-between rounded-lg p-2.5 text-left text-xs transition-all ${
                isActive
                  ? "border border-[#C4FF61] bg-[#C4FF61]/10 text-foreground font-semibold shadow-xs"
                  : "border border-border/50 bg-background/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <div className="truncate pr-2">
                <div className="truncate font-medium text-foreground">
                  {b.serviceType || "Custom Tattoo"}
                </div>
                <div className="text-[11px] text-muted-foreground">{stageLabel}</div>
              </div>
              <ChevronRight className={`size-3.5 shrink-0 transition-transform ${isActive ? "text-[#C4FF61]" : "text-muted-foreground/60"}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
