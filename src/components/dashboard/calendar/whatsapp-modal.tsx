import React from "react";
import { MessageSquare, Copy, ExternalLink, User, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { normalizePhoneForWhatsApp } from "@/lib/services/whatsapp-composer";

export interface WhatsAppData {
  clientName: string;
  phone: string;
  message: string;
  url: string;
}

interface WhatsAppConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: WhatsAppData | null;
}

export function WhatsAppConfirmationModal({
  open,
  onOpenChange,
  data,
}: WhatsAppConfirmationModalProps) {
  if (!data) return null;

  const normalizedPhone = normalizePhoneForWhatsApp(data.phone);
  const displayPhone = normalizedPhone
    ? normalizedPhone.startsWith("91") && normalizedPhone.length === 12
      ? `+91 ${normalizedPhone.slice(2, 7)} ${normalizedPhone.slice(7)}`
      : `+${normalizedPhone}`
    : data.phone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif font-light text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#25D366]" />
            <span>WhatsApp Appointment Confirmation</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Metadata Card: Explicit Sender (Prerna) & Receiver (Client) */}
          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-light flex items-center gap-1.5">
                <Send className="h-3 w-3 text-[#25D366]" />
                <span>Sender (Artist):</span>
              </span>
              <span className="font-medium text-foreground">
                Prerna • Meet Prerna Tattoo Studio
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-light flex items-center gap-1.5">
                <User className="h-3 w-3 text-muted-foreground" />
                <span>Receiver (Client):</span>
              </span>
              <span className="font-medium text-foreground">
                {data.clientName}{" "}
                <span className="text-muted-foreground font-mono text-[11px]">
                  ({displayPhone})
                </span>
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-foreground font-mono whitespace-pre-wrap leading-relaxed">
            {data.message}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(data.message);
                toast.success("Confirmation message copied to clipboard!");
              }}
              className="flex-1 gap-1.5 text-xs"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Message</span>
            </Button>

            {data.url ? (
              <Button
                size="sm"
                asChild
                className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium gap-1.5 text-xs"
              >
                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onOpenChange(false)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open in WhatsApp</span>
                </a>
              </Button>
            ) : (
              <Button
                size="sm"
                disabled
                className="flex-1 bg-muted text-muted-foreground font-medium gap-1.5 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>No Phone Available</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
