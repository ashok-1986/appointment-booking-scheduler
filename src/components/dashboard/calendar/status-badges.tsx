import React from "react";
import { ShieldCheck, ShieldAlert, Clock, AlertCircle } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "scheduled":
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4FF61]/20 text-[#1A1A1A] dark:text-[#C4FF61] border border-[#C4FF61]/40">
          Scheduled
        </span>
      );
    case "in_progress":
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 animate-pulse">
          In Progress
        </span>
      );
    case "completed":
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          Completed
        </span>
      );
    case "cancelled":
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 line-through">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {status}
        </span>
      );
  }
}

export function ConsentBadge({ consentStatus }: { consentStatus: string }) {
  switch (consentStatus) {
    case "signed":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          <ShieldCheck className="h-3 w-3" />
          <span>Consent Signed</span>
        </span>
      );
    case "sent":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          <Clock className="h-3 w-3" />
          <span>Form Sent</span>
        </span>
      );
    case "overridden":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
          <ShieldAlert className="h-3 w-3" />
          <span>Overridden</span>
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
          <AlertCircle className="h-3 w-3 text-amber-500" />
          <span>Consent Pending</span>
        </span>
      );
  }
}
