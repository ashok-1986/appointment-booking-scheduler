"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Instagram, Phone, Mail, MapPin, Calendar, CreditCard, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { Client } from "@/lib/schema";

export function ClientPropertiesCard({
  customer,
  formattedTotalSpend,
  projectsCount,
  hasSignedConsent,
}: {
  customer: Client;
  formattedTotalSpend: string;
  projectsCount: number;
  hasSignedConsent: boolean;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs font-body">
      <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          About this Client
        </h3>
        {hasSignedConsent ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-3.5" /> Waiver On File
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-3.5" /> Waiver Pending
          </span>
        )}
      </div>

      <div className="space-y-3 text-xs">
        {/* Phone */}
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="size-3.5" />
            <span>Phone</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span>{customer.phone}</span>
            <button
              onClick={() => copyToClipboard(customer.phone, "phone", "Phone number")}
              className="text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 transition-opacity"
              title="Copy phone"
            >
              {copiedKey === "phone" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            </button>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="size-3.5" />
            <span>Email</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-foreground max-w-[170px] truncate" title={customer.email}>
            <span className="truncate">{customer.email}</span>
            <button
              onClick={() => copyToClipboard(customer.email, "email", "Email")}
              className="text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 transition-opacity shrink-0"
              title="Copy email"
            >
              {copiedKey === "email" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            </button>
          </div>
        </div>

        {/* Instagram */}
        {customer.instagramHandle && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Instagram className="size-3.5 text-pink-500" />
              <span>Instagram</span>
            </div>
            <a
              href={`https://instagram.com/${customer.instagramHandle.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-pink-600 hover:underline dark:text-pink-400"
            >
              <span>{customer.instagramHandle.startsWith("@") ? customer.instagramHandle : `@${customer.instagramHandle}`}</span>
              <ExternalLink className="size-2.5" />
            </a>
          </div>
        )}

        {/* City */}
        {customer.city && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-3.5" />
              <span>Location</span>
            </div>
            <span className="font-medium text-foreground">{customer.city}</span>
          </div>
        )}

        {/* Date of Birth / Age */}
        {customer.dateOfBirth && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-3.5" />
              <span>Date of Birth</span>
            </div>
            <span className="font-medium text-foreground">{customer.dateOfBirth}</span>
          </div>
        )}

        {/* Lifetime Revenue */}
        <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="size-3.5" />
            <span>Lifetime Revenue</span>
          </div>
          <span className="font-heading font-bold text-sm text-foreground text-emerald-600 dark:text-[#C4FF61]">
            {formattedTotalSpend}
          </span>
        </div>

        {/* Total Tattoo Projects */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Tattoo Projects</span>
          <span className="font-medium text-foreground">{projectsCount}</span>
        </div>
      </div>
    </div>
  );
}
