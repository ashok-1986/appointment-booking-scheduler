"use client";

import { format } from "date-fns";
import { Calendar, Clock, Plus, ShieldCheck, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function UpcomingSessionsCard({
  sessions,
  onOpenScheduleModal,
}: {
  sessions: any[];
  onOpenScheduleModal: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs font-body">
      <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Calendar & Sessions ({sessions.length})
          </h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenScheduleModal}
          className="h-6 text-[11px] px-2 text-foreground border-border/80 hover:border-[#C4FF61] hover:bg-[#C4FF61]/10"
        >
          <Plus className="mr-1 size-3 text-[#C4FF61]" /> Schedule
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          <Calendar className="mx-auto mb-1.5 size-6 text-muted-foreground/40" />
          <p className="font-medium">No sessions scheduled yet.</p>
          <button
            type="button"
            onClick={onOpenScheduleModal}
            className="mt-1 text-[11px] font-semibold text-[#C4FF61] hover:underline"
          >
            + Book Studio Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sessions.map((s, idx) => {
            const start = s.scheduledStart ? new Date(s.scheduledStart) : null;
            const isCompleted = s.status === "completed";
            const isConsentSigned = s.consentStatus === "signed";

            return (
              <div
                key={s.id || idx}
                className="rounded-lg border border-border/50 bg-background/50 p-2.5 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">
                    Session #{s.sessionNumber || idx + 1}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-4.5 font-medium ${
                      isCompleted
                        ? "border-emerald-300 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                        : "border-blue-300 bg-blue-500/10 text-blue-800 dark:text-blue-300"
                    }`}
                  >
                    {isCompleted ? "Completed" : "Scheduled"}
                  </Badge>
                </div>

                {start && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-3 text-muted-foreground" />
                    <span>{format(start, "EEE, dd MMM yyyy • h:mm a")}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border/30 pt-1.5 text-[11px]">
                  <span className="text-muted-foreground">
                    Duration: {s.durationMinutes || 180} mins
                  </span>

                  {isConsentSigned ? (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="size-3" /> Signed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                      <ShieldAlert className="size-3" /> Waiver Pending
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
