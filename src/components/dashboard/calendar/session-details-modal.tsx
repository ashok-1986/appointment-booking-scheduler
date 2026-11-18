import React from "react";
import { Phone, Mail, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge, ConsentBadge } from "./status-badges";
import { SessionItem } from "./types";

interface SessionDetailsModalProps {
  session: SessionItem | null;
  onClose: () => void;
  onUpdateStatus: (sessionId: string, status: string) => Promise<void>;
  onTriggerWhatsApp: (session: SessionItem) => void;
}

export function SessionDetailsModal({
  session,
  onClose,
  onUpdateStatus,
  onTriggerWhatsApp,
}: SessionDetailsModalProps) {
  if (!session) return null;

  return (
    <Dialog open={!!session} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif font-light text-foreground flex items-center justify-between">
            <span>Session Details</span>
            <StatusBadge status={session.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Client Info */}
          <div className="p-3.5 rounded-xl border bg-zinc-50/50 dark:bg-zinc-900/40 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              Client Information
            </p>
            <div className="flex items-center justify-between">
              <span className="text-base font-serif font-medium text-foreground">
                {session.client.name}
              </span>
              {session.client.instagramHandle && (
                <span className="text-xs text-[#C4FF61] font-mono">
                  @{session.client.instagramHandle.replace("@", "")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {session.client.phone}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {session.client.email}
              </span>
            </div>
          </div>

          {/* Time & Service */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border bg-card">
              <span className="text-muted-foreground text-[11px]">Date & Time</span>
              <p className="font-medium text-foreground mt-0.5">
                {new Date(session.scheduledStart).toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </p>
              <p className="text-muted-foreground text-[11px] font-mono">
                {new Date(session.scheduledStart).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                to{" "}
                {new Date(session.scheduledEnd).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-card">
              <span className="text-muted-foreground text-[11px]">Service & Placement</span>
              <p className="font-medium text-foreground mt-0.5">
                {session.booking.serviceType}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {session.booking.placement || "General"}
              </p>
            </div>
          </div>

          {/* Consent Status */}
          <div className="p-3 rounded-xl border bg-card flex items-center justify-between">
            <div>
              <span className="text-muted-foreground text-[11px]">Consent Status</span>
              <div className="mt-1">
                <ConsentBadge consentStatus={session.consentStatus} />
              </div>
            </div>
            {session.consentStatus !== "signed" && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-light">
                Requires signature before session
              </span>
            )}
          </div>

          {/* Notes */}
          {(session.booking.designDescription || session.notes) && (
            <div className="p-3 rounded-xl border bg-card space-y-1 text-xs">
              <span className="text-muted-foreground text-[11px]">Notes & Description</span>
              {session.booking.designDescription && (
                <p className="text-foreground font-light">
                  {session.booking.designDescription}
                </p>
              )}
              {session.notes && (
                <p className="text-zinc-500 italic pt-1">
                  Studio Note: {session.notes}
                </p>
              )}
            </div>
          )}

          {/* Status Update Actions */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-medium">Update Session Status</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus(session.id, "in_progress")}
                disabled={session.status === "in_progress"}
                className="text-xs"
              >
                Mark In-Progress
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus(session.id, "completed")}
                disabled={session.status === "completed"}
                className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
              >
                Mark Completed
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus(session.id, "cancelled")}
                disabled={session.status === "cancelled"}
                className="text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-900"
              >
                Cancel Session
              </Button>
            </div>
          </div>

          {/* Bottom WhatsApp Button */}
          <div className="pt-3 border-t flex items-center justify-between">
            <Button
              onClick={() => onTriggerWhatsApp(session)}
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Send WhatsApp Confirmation</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
