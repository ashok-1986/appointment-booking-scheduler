"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, ExternalLink, Download } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function ImageLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  title = "Tattoo Media Preview",
}: {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
}) {
  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-2 bg-background/95 backdrop-blur-md border-border/80 font-body overflow-hidden">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="relative flex flex-col items-center justify-center">
          {/* Top Bar with actions */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              title="Open full resolution in new tab"
            >
              <ExternalLink className="size-4" />
            </a>
            <a
              href={imageUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              title="Download photograph"
            >
              <Download className="size-4" />
            </a>
          </div>

          {/* Image Display */}
          <div className="relative max-h-[80vh] w-full flex items-center justify-center overflow-auto p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={title}
              className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />
          </div>

          <div className="mt-2 flex w-full items-center justify-between px-3 pb-1 text-xs text-muted-foreground">
            <span className="font-heading text-foreground font-semibold">{title}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-7 text-xs hover:bg-muted"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
