"use client";

import { useState } from "react";
import { MessageSquare, ExternalLink, Send, Loader2, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TEMPLATES = [
  {
    label: "Consultation Ready",
    text: "Hi {{name}}, I reviewed your tattoo design brief and references! I'd love to discuss placement and sizing with you.",
  },
  {
    label: "Deposit Payment Link",
    text: "Hi {{name}}, your custom tattoo quote has been prepared. Please confirm your booking with the deposit link here:",
  },
  {
    label: "Session Reminder",
    text: "Hi {{name}}, friendly reminder of our tattoo session tomorrow! Please stay well hydrated and arrive well-rested.",
  },
  {
    label: "Aftercare Guide",
    text: "Hi {{name}}, thank you for sitting today! Remember to follow the studio aftercare routine: keep it clean, moisturize gently, and avoid direct sun.",
  },
];

export function QuickWhatsAppComposer({
  customerName,
  customerPhone,
  onSend,
}: {
  customerName: string;
  customerPhone: string;
  onSend: (content: string, logOnly?: boolean) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const cleanPhone = customerPhone.replace(/[^0-9]/g, "");

  const handleApplyTemplate = (tplText: string) => {
    setMessage(tplText.replace("{{name}}", customerName.split(" ")[0]));
  };

  const handleDirectWhatsAppWeb = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message to send");
      return;
    }
    const encoded = encodeURIComponent(message.trim());
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");

    // Automatically log this message to the studio timeline
    await onSend(message.trim(), true);
    setMessage("");
  };

  const handleSendCloudApi = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message to send");
      return;
    }
    setIsSending(true);
    try {
      await onSend(message.trim(), false);
      setMessage("");
    } finally {
      setIsSending(false);
    }
  };

  const handleLogOnly = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message to log");
      return;
    }
    setIsSending(true);
    try {
      await onSend(message.trim(), true);
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
        <span className="text-[11px] text-muted-foreground">To: +{cleanPhone}</span>
      </div>

      {/* Quick Templates */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.label}
            type="button"
            onClick={() => handleApplyTemplate(tpl.text)}
            className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:border-[#C4FF61] hover:text-foreground transition-colors"
          >
            + {tpl.label}
          </button>
        ))}
      </div>

      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`Type a message to ${customerName}...`}
        className="min-h-[85px] text-xs resize-none bg-background/50 focus-visible:ring-1 focus-visible:ring-[#C4FF61]"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleLogOnly}
          disabled={isSending || !message.trim()}
          className="text-xs h-8 text-muted-foreground hover:text-foreground"
        >
          <BookmarkCheck className="mr-1.5 size-3" /> Log to Timeline Only
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleDirectWhatsAppWeb}
            disabled={!message.trim()}
            className="h-8 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
          >
            <ExternalLink className="mr-1.5 size-3" /> Open in WhatsApp Web
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSendCloudApi}
            disabled={isSending || !message.trim()}
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
