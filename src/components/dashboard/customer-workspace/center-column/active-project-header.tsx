"use client";

import { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MapPin, Maximize2, Sparkles, Clock, Calendar, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { parseBookingDetails, formatPaise } from "@/lib/booking-parser";

export function ActiveProjectHeader({
  booking,
  onImageClick,
}: {
  booking: any;
  onImageClick: (url: string) => void;
}) {
  const intake = useMemo(() => {
    return parseBookingDetails(booking.designDescription);
  }, [booking.designDescription]);

  const submissionDate = booking.createdAt ? new Date(booking.createdAt) : null;
  const elapsed = submissionDate
    ? formatDistanceToNow(submissionDate, { addSuffix: true })
    : null;

  const images = (booking.referenceImages || []) as string[];

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs font-body">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Active Project
            </span>
            <Badge
              variant="outline"
              className="border-[#C4FF61]/50 bg-[#C4FF61]/10 text-xs font-semibold text-foreground dark:text-[#C4FF61]"
            >
              {booking.serviceType || "Custom Tattoo"}
            </Badge>

            {booking.placement && (
              <Badge variant="outline" className="border-border text-xs text-muted-foreground">
                <MapPin className="mr-1 size-3 text-muted-foreground" />
                {booking.placement}
              </Badge>
            )}

            {booking.approximateSize && (
              <Badge variant="outline" className="border-border text-xs text-muted-foreground">
                <Maximize2 className="mr-1 size-3 text-muted-foreground" />
                {booking.approximateSize}
              </Badge>
            )}

            {booking.style && (
              <Badge variant="outline" className="border-border text-xs text-muted-foreground">
                <Sparkles className="mr-1 size-3 text-muted-foreground" />
                {booking.style}
              </Badge>
            )}
          </div>

          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {booking.serviceType || "Bespoke Tattoo Project"}
          </h2>
        </div>

        {submissionDate && (
          <div className="flex items-center gap-1.5 text-right text-xs text-muted-foreground sm:flex-col sm:items-end">
            <div className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              <span>Enquiry {elapsed}</span>
            </div>
            <span className="text-[11px] opacity-75">
              {format(submissionDate, "dd MMM yyyy, h:mm a")}
            </span>
          </div>
        )}
      </div>

      {/* Description / Story */}
      <div className="mt-3.5 rounded-lg border border-border/50 bg-muted/20 p-3 text-xs leading-relaxed text-foreground/90">
        <p className="font-medium text-foreground mb-1">Concept & Brief:</p>
        <p className="whitespace-pre-line text-muted-foreground">
          {intake.design || booking.designDescription || "No design brief provided yet."}
        </p>

        {intake.timeline && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground border-t border-border/30 pt-2">
            <Calendar className="size-3 text-muted-foreground" />
            <span>Target Timeline: <strong className="text-foreground">{intake.timeline}</strong></span>
          </div>
        )}
      </div>

      {/* Reference Images Preview */}
      {images.length > 0 && (
        <div className="mt-4 border-t border-border/40 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <ImageIcon className="size-3.5" /> Client Reference Images ({images.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {images.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onImageClick(url)}
                className="group relative size-16 overflow-hidden rounded-md border border-border/70 hover:border-[#C4FF61] transition-colors"
              >
                <Image
                  src={url}
                  alt={`Reference ${idx + 1}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
