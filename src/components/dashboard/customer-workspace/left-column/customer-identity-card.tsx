"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Crown } from "lucide-react";
import type { Client } from "@/lib/schema";

export function CustomerIdentityCard({
  customer,
  isRepeat,
  totalSpendNumber,
}: {
  customer: Client;
  isRepeat: boolean;
  totalSpendNumber: number;
}) {
  const monogram = useMemo(() => {
    const parts = customer.name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return customer.name.slice(0, 2).toUpperCase();
  }, [customer.name]);

  const isVip = totalSpendNumber >= 20000 || isRepeat;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 text-center shadow-xs font-body">
      <div className="relative mx-auto mb-3 flex size-18 items-center justify-center rounded-full border-2 border-[#C4FF61] bg-[#C4FF61]/15 text-2xl font-bold tracking-wider text-foreground">
        {monogram}
        {isVip && (
          <span
            className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs"
            title="VIP Studio Client"
          >
            <Crown className="size-3.5 fill-white" />
          </span>
        )}
      </div>

      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
        {customer.name}
      </h1>

      <p className="mt-0.5 text-xs text-muted-foreground">
        Client since {customer.createdAt ? format(new Date(customer.createdAt), "MMMM yyyy") : "Recently"}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        {isRepeat ? (
          <Badge
            variant="outline"
            className="border-emerald-300 bg-emerald-500/10 text-[11px] font-medium text-emerald-800 dark:border-emerald-800 dark:text-emerald-300"
          >
            <Sparkles className="mr-1 size-3" /> Repeat Collector
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-border bg-muted/40 text-[11px] font-medium text-muted-foreground"
          >
            New Client
          </Badge>
        )}

        {customer.city && (
          <Badge
            variant="outline"
            className="border-border bg-muted/30 text-[11px] text-muted-foreground"
          >
            {customer.city}
          </Badge>
        )}
      </div>
    </div>
  );
}
