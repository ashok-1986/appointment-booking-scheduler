"use client";

import { CreditCard, CheckCircle2, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export function FinancialSummaryCard({
  booking,
  allPayments,
  formattedTotalSpend,
}: {
  booking: any;
  allPayments: any[];
  formattedTotalSpend: string;
}) {
  const depositPaid = booking?.depositPaidAt != null;
  const balancePaid = booking?.balancePaidAt != null;

  const depositPaise = booking?.depositAmount ? Number(booking.depositAmount) : 0;
  const balancePaise = booking?.balanceAmount ? Number(booking.balanceAmount) : 0;

  const depositFormatted = depositPaise > 0 ? `₹${(depositPaise / 100).toLocaleString("en-IN")}` : "—";
  const balanceFormatted = balancePaise > 0 ? `₹${(balancePaise / 100).toLocaleString("en-IN")}` : "—";

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs font-body">
      <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5">
          <CreditCard className="size-3.5 text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Financial Ledger
          </h3>
        </div>
        <span className="font-heading font-bold text-sm text-[#C4FF61]">
          {formattedTotalSpend}
        </span>
      </div>

      {/* Active Project Deposit / Balance Status */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between rounded-lg bg-background/50 p-2 border border-border/40">
          <div>
            <span className="text-muted-foreground block text-[11px]">Required Deposit</span>
            <span className="font-semibold text-foreground">{depositFormatted}</span>
          </div>
          <div>
            {depositPaid ? (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="mr-1 size-3" /> Paid
              </Badge>
            ) : depositPaise > 0 ? (
              <Badge variant="outline" className="border-amber-300 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">
                <Clock className="mr-1 size-3" /> Pending
              </Badge>
            ) : (
              <span className="text-muted-foreground text-[11px]">Unquoted</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-background/50 p-2 border border-border/40">
          <div>
            <span className="text-muted-foreground block text-[11px]">Remaining Balance</span>
            <span className="font-semibold text-foreground">{balanceFormatted}</span>
          </div>
          <div>
            {balancePaid ? (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="mr-1 size-3" /> Settled
              </Badge>
            ) : balancePaise > 0 ? (
              <Badge variant="outline" className="border-amber-300 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">
                <Clock className="mr-1 size-3" /> Due at Studio
              </Badge>
            ) : (
              <span className="text-muted-foreground text-[11px]">Pending Session</span>
            )}
          </div>
        </div>
      </div>

      {/* Stacked Transactions History */}
      {allPayments.length > 0 && (
        <div className="mt-3 border-t border-border/40 pt-2.5">
          <span className="text-[11px] font-medium text-muted-foreground block mb-1.5">
            Gateway Payments ({allPayments.length})
          </span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {allPayments.map((p) => {
              const paise = Number(p.amount);
              const rupees = `₹${(paise / 100).toLocaleString("en-IN")}`;
              const isPaid = p.status === "paid";
              const date = p.createdAt ? new Date(p.createdAt) : null;

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-[11px] rounded bg-muted/20 px-2 py-1"
                >
                  <div>
                    <span className="capitalize font-medium text-foreground">{p.type}</span>
                    {date && (
                      <span className="text-[10px] text-muted-foreground ml-1.5">
                        {format(date, "dd MMM")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">{rupees}</span>
                    <span
                      className={`size-1.5 rounded-full ${
                        isPaid ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
