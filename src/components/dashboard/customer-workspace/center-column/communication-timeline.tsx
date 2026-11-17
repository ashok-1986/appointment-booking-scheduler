"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { MessageSquare, Mail, ArrowUpRight, ArrowDownLeft, Clock, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CommunicationTimeline({
  messages,
  activeBookingId,
}: {
  messages: any[];
  activeBookingId: string | null;
}) {
  const [filterMode, setFilterMode] = useState<"active" | "all">("active");

  const filteredMessages = useMemo(() => {
    if (filterMode === "active" && activeBookingId) {
      return messages.filter((m) => m.bookingId === activeBookingId);
    }
    return messages;
  }, [messages, filterMode, activeBookingId]);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs font-body">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Communications & Activity Timeline
          </h3>
          <Badge variant="outline" className="text-[10px] h-5 border-border/60">
            {filteredMessages.length} events
          </Badge>
        </div>

        {/* Project Filter Toggle */}
        <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode("active")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              filterMode === "active"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active Project
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              filterMode === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Client History
          </button>
        </div>
      </div>

      {/* Scroll-contained Timeline Feed */}
      <div className="max-h-[460px] overflow-y-auto pr-1 space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            <MessageSquare className="mx-auto mb-2 size-8 text-muted-foreground/40" />
            <p className="font-medium">No messages or touchpoints logged yet.</p>
            <p className="text-[11px] mt-0.5">Dispatched WhatsApp updates and automated emails will appear here.</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isWhatsApp = msg.channel === "whatsapp";
            const isOutbound = msg.direction === "outbound";
            const date = msg.createdAt ? new Date(msg.createdAt) : null;

            return (
              <div
                key={msg.id}
                className="group relative flex gap-3 rounded-lg border border-border/50 bg-background/60 p-3 hover:border-border transition-colors text-xs"
              >
                {/* Channel Icon */}
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                    isWhatsApp
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {isWhatsApp ? <MessageSquare className="size-4" /> : <Mail className="size-4" />}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">
                        {isWhatsApp ? "WhatsApp Message" : "Email Notification"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.2 rounded ${
                          isOutbound
                            ? "bg-muted text-muted-foreground"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {isOutbound ? (
                          <>
                            <ArrowUpRight className="size-2.5" /> Sent
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="size-2.5" /> Inbound
                          </>
                        )}
                      </span>
                    </div>

                    {date && (
                      <span className="text-[11px] text-muted-foreground" title={format(date, "PPP p")}>
                        {format(date, "dd MMM, h:mm a")}
                      </span>
                    )}
                  </div>

                  <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
