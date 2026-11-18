"use client";

import { useState, useMemo } from "react";
import { MessageSquare, ExternalLink, Send, Loader2, BookmarkCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  buildPersonalizedWhatsAppMessage,
  buildPersonalizedWhatsAppUrl,
  normalizePhoneForWhatsApp,
  WHATSAPP_STAGE_TEMPLATES,
  applyWhatsAppTemplate,
} from "@/lib/services/whatsapp-composer";

export function QuickWhatsAppComposer({
  customerName,
  customerPhone,
  bookingStage,
  serviceType,
  placement,
  isRepeat,
  onSend,
}: {
  customerName: string;
  customerPhone: string;
  bookingStage?: string | null;
  serviceType?: string | null;
  placement?: string | null;
  isRepeat?: boolean;
  onSend: (content: string, logOnly?: boolean) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const cleanPhone = normalizePhoneForWhatsApp(customerPhone);

  const defaultStageMessage = useMemo(() => {
    return buildPersonalizedWhatsAppMessage({
      phone: customerPhone,
      name: customerName,
      stage: bookingStage,
      serviceType,
      placement,
      isRepeat,
    });
  }, [customerPhone, customerName, bookingStage, serviceType, placement, isRepeat]);

  const handleDirectWhatsAppWeb = async () => {
    const trimmed = message.trim();
    const messageToSend = trimmed || defaultStageMessage;
    if (!messageToSend) {
      toast.error("Please enter a message to send");
      return;
    }

    let waUrl = "";
    if (!trimmed) {
      waUrl = buildPersonalizedWhatsAppUrl({
        phone: customerPhone,
        name: customerName,
        stage: bookingStage,
        serviceType,
        placement,
        isRepeat,
      });
    } else if (
      trimmed.startsWith("Hi ") ||
      trimmed.startsWith("Hello ") ||
      trimmed.startsWith("Hey ")
    ) {
      const phoneDigits = normalizePhoneForWhatsApp(customerPhone);
      waUrl = phoneDigits ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(trimmed)}` : "";
    } else {
      waUrl = buildPersonalizedWhatsAppUrl({
        phone: customerPhone,
        name: customerName,
        stage: bookingStage,
        serviceType,
        placement,
        isRepeat,
        customNote: trimmed,
      });
    }

    if (!waUrl) {
      toast.error("Failed to generate WhatsApp URL. Please verify customer phone number.");
      return;
    }

    window.open(waUrl, "_blank", "noopener,noreferrer");

    // Automatically log this message to the studio timeline
    await onSend(messageToSend, true);
    setMessage("");
  };

  const handleSendCloudApi = async () => {
    const messageToSend = message.trim() || defaultStageMessage;
    if (!messageToSend) {
      toast.error("Please enter a message to send");
      return;
    }
    setIsSending(true);
    try {
      await onSend(messageToSend, false);
      setMessage("");
    } finally {
      setIsSending(false);
    }
  };

  const handleLogOnly = async () => {
    const messageToSend = message.trim() || defaultStageMessage;
    if (!messageToSend) {
      toast.error("Please enter a message to log");
      return;
    }
    setIsSending(true);
    try {
      await onSend(messageToSend, true);
      setMessage("");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs font-body">
      <div className="mb-2.5 flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-emerald-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Quick WhatsApp Dispatch & Log
          </h3>
        </div>
        <span className="text-[11px] text-muted-foreground">
          To: +{cleanPhone || customerPhone}
        </span>
      </div>

      {/* Quick Templates & Load Stage Default */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMessage(defaultStageMessage)}
          className="h-6 px-2.5 text-[10px] font-medium rounded-full border-[#C4FF61]/50 bg-[#C4FF61]/10 text-emerald-800 dark:text-[#C4FF61] hover:bg-[#C4FF61]/20 transition-colors"
          title="Load stage-specific default message"
        >
          <Sparkles className="mr-1 size-2.5 text-emerald-600 dark:text-[#C4FF61]" />
          Load Stage Default
        </Button>
        {WHATSAPP_STAGE_TEMPLATES.map((tpl) => (
          <button
            key={tpl.stage}
            type="button"
            onClick={() => setMessage(applyWhatsAppTemplate(tpl.text, customerName))}
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
              bookingStage === tpl.stage
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold"
                : "border-border/70 bg-muted/40 text-muted-foreground hover:border-[#C4FF61] hover:text-foreground"
            }`}
          >
            + {tpl.label}
          </button>
        ))}
        {message && (
          <button
            type="button"
            onClick={() => setMessage("")}
            className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={
          defaultStageMessage
            ? `Type a message to ${customerName} (or leave empty to send stage default)...`
            : `Type a message to ${customerName}...`
        }
        className="min-h-[85px] text-xs resize-none bg-background/50 focus-visible:ring-1 focus-visible:ring-[#C4FF61]"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleLogOnly}
          disabled={isSending || (!message.trim() && !defaultStageMessage)}
          className="text-xs h-8 text-muted-foreground hover:text-foreground"
        >
          <BookmarkCheck className="mr-1.5 size-3" /> Log to Timeline Only
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleDirectWhatsAppWeb}
            disabled={!message.trim() && !defaultStageMessage}
            className="h-8 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
          >
            <ExternalLink className="mr-1.5 size-3" /> Open in WhatsApp Web
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSendCloudApi}
            disabled={isSending || (!message.trim() && !defaultStageMessage)}
            className="h-8 text-xs bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40"
          >
            {isSending ? (
              <Loader2 className="mr-1.5 size-3 animate-spin" />
            ) : (
              <Send className="mr-1.5 size-3 text-[#C4FF61]" />
            )}
            Cloud API Send
          </Button>
        </div>
      </div>
    </div>
  );
}
