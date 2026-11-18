import React from "react";
import { MessageSquare, Copy, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
          <p className="text-xs text-muted-foreground font-light">
            Ready to send confirmation message to{" "}
            <strong className="text-foreground">{data.clientName}</strong> ({data.phone}):
          </p>

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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
