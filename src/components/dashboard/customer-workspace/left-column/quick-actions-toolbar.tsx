"use client";

import { MessageSquare, Mail, Phone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActionsToolbar({
  phone,
  email,
  onOpenWhatsApp,
  onOpenEmail,
  onOpenCall,
  onFocusNotes,
}: {
  phone: string;
  email: string;
  onOpenWhatsApp: () => void;
  onOpenEmail: () => void;
  onOpenCall: () => void;
  onFocusNotes: () => void;
}) {
  return (
    <div className="flex items-center justify-around rounded-xl border border-border/70 bg-card p-2 shadow-xs font-body">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenWhatsApp}
        className="flex size-11 flex-col items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
        title="Quick WhatsApp Dispatch"
        aria-label="WhatsApp"
      >
        <MessageSquare className="size-4.5" />
        <span className="text-[10px] font-medium">WhatsApp</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenEmail}
        className="flex size-11 flex-col items-center justify-center rounded-lg text-blue-600 hover:bg-blue-500/10 hover:text-blue-700 dark:text-blue-400"
        title={`Send Email to ${email}`}
        aria-label="Email"
      >
        <Mail className="size-4.5" />
        <span className="text-[10px] font-medium">Email</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenCall}
        className="flex size-11 flex-col items-center justify-center rounded-lg text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400"
        title={`Call ${phone}`}
        aria-label="Call"
      >
        <Phone className="size-4.5" />
        <span className="text-[10px] font-medium">Call</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onFocusNotes}
        className="flex size-11 flex-col items-center justify-center rounded-lg text-purple-600 hover:bg-purple-500/10 hover:text-purple-700 dark:text-purple-400"
        title="Artist Notes"
        aria-label="Notes"
      >
        <FileText className="size-4.5" />
        <span className="text-[10px] font-medium">Notes</span>
      </Button>
    </div>
  );
}
