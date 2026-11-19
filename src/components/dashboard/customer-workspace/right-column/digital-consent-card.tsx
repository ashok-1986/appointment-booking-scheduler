"use client";

import { ShieldCheck, ShieldAlert, FileText, ExternalLink, PenTool, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DigitalConsentCard({
  bookingId,
  consentRecords,
  onOpenPaperOverrideModal,
}: {
  bookingId: string | null;
  consentRecords: any[];
  onOpenPaperOverrideModal: () => void;
}) {
  const latestConsent = consentRecords[0] || null;
  const isSigned =
    latestConsent != null &&
    (latestConsent.status === "signed" || Boolean(latestConsent.signedAt));
  const idProofType =
    latestConsent?.healthDisclosures?.idProofType || latestConsent?.idProofType;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs font-body">
      <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Legal & Digital Consent
          </h3>
        </div>
        {isSigned ? (
          <Badge variant="outline" className="border-emerald-300 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="mr-1 size-3" /> Legally Valid
          </Badge>
        ) : (
          <Badge variant="outline" className="border-amber-300 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">
            <ShieldAlert className="mr-1 size-3" /> Form Pending
          </Badge>
        )}
      </div>

      <div className="space-y-2 text-xs">
        {isSigned ? (
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                Waiver Signed on iPad
              </span>
              <span className="text-[10px] text-muted-foreground">
                {latestConsent.signedAt ? format(new Date(latestConsent.signedAt), "dd MMM yyyy") : "Signed"}
              </span>
            </div>

            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <p>• Age Verification: 18+ Confirmed</p>
              {idProofType && (
                <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                  • ID Proof: {idProofType} On File
                </p>
              )}
              <p>• Medical Disclosures: Reviewed & Cleared</p>
              <p>• Marketing & Photo Consent: {latestConsent.consentMarketing || latestConsent.marketingConsent ? "Granted" : "Withheld"}</p>
            </div>

            {(latestConsent.signatureImageUrl || latestConsent.signatureDataUrl) && (
              <div className="mt-2 rounded bg-background p-1 border border-border/40 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={latestConsent.signatureImageUrl || latestConsent.signatureDataUrl}
                  alt="Client Signature"
                  className="mx-auto max-h-12 object-contain dark:invert"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-2.5 space-y-2">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              No signed digital waiver on record for this customer. Hand the studio iPad to the client prior to beginning tattooing.
            </p>

            <div className="flex flex-col gap-1.5">
              {bookingId && (
                <a
                  href={`/consent/${bookingId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background py-1.5 text-xs font-semibold hover:bg-foreground/90 transition-colors"
                >
                  <PenTool className="size-3 text-[#C4FF61]" /> Launch iPad Waiver Form
                  <ExternalLink className="size-3" />
                </a>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenPaperOverrideModal}
                className="text-[11px] h-7 text-muted-foreground hover:text-foreground"
              >
                Log Physical Paper Form Override
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
