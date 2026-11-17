"use client";

import * as React from "react";
import { RotateCcw, PenLine, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: (type?: string, quality?: number) => string | null;
}

export interface SignaturePadProps {
  onSignatureChange?: (dataUrl: string | null) => void;
  disabled?: boolean;
  className?: string;
  height?: number;
  penColor?: string;
  strokeWidth?: number;
}

export const SignaturePad = React.forwardRef<SignaturePadRef, SignaturePadProps>(
  (
    {
      onSignatureChange,
      disabled = false,
      className,
      height = 190,
      penColor = "#18181b",
      strokeWidth = 2.5,
    },
    ref
  ) => {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);

    const isDrawingRef = React.useRef(false);
    const strokeCountRef = React.useRef(0);
    const currentDataUrlRef = React.useRef<string | null>(null);
    const [hasStrokes, setHasStrokes] = React.useState(false);

    // Setup High-DPI Canvas
    const setupCanvas = React.useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const w = Math.max(rect.width, 300);
      const h = height;

      // Save content if already drawn
      const previousDataUrl = currentDataUrlRef.current;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = penColor;

      // Restore if we had drawing
      if (previousDataUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, w, h);
        };
        img.src = previousDataUrl;
      }
    }, [height, penColor, strokeWidth]);

    React.useEffect(() => {
      setupCanvas();

      const container = containerRef.current;
      if (!container || typeof ResizeObserver === "undefined") return;

      const observer = new ResizeObserver(() => {
        setupCanvas();
      });
      observer.observe(container);

      return () => {
        observer.disconnect();
      };
    }, [setupCanvas]);

    const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignored if pointer capture isn't supported
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCanvasCoordinates(e);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();

      isDrawingRef.current = true;
      strokeCountRef.current += 1;
      setHasStrokes(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCanvasCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();

      strokeCountRef.current += 1;
    };

    const endDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          // Ignored
        }

        if (strokeCountRef.current > 0) {
          const dataUrl = canvas.toDataURL("image/png");
          currentDataUrlRef.current = dataUrl;
          setHasStrokes(true);
          onSignatureChange?.(dataUrl);
        }
      }
    };

    const clear = React.useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Reset transforms and clear entire backing buffer
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      strokeCountRef.current = 0;
      currentDataUrlRef.current = null;
      setHasStrokes(false);
      onSignatureChange?.(null);
    }, [onSignatureChange]);

    const isEmpty = React.useCallback(() => {
      return strokeCountRef.current === 0 || !currentDataUrlRef.current;
    }, []);

    const toDataURL = React.useCallback(
      (type: string = "image/png", quality?: number) => {
        const canvas = canvasRef.current;
        if (!canvas || isEmpty()) return null;
        return canvas.toDataURL(type, quality);
      },
      [isEmpty]
    );

    React.useImperativeHandle(
      ref,
      () => ({
        clear,
        isEmpty,
        toDataURL,
      }),
      [clear, isEmpty, toDataURL]
    );

    return (
      <div className={cn("flex flex-col gap-2 w-full", className)}>
        <div
          ref={containerRef}
          className={cn(
            "relative w-full rounded-xl border-2 border-dashed transition-colors overflow-hidden select-none",
            hasStrokes
              ? "border-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-950/10"
              : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/60",
            disabled && "opacity-60 cursor-not-allowed"
          )}
          style={{ minHeight: `${height}px` }}
        >
          {/* Subtle signature guideline & 'X' mark */}
          <div className="pointer-events-none absolute inset-x-6 bottom-10 flex items-center gap-3 text-zinc-300 dark:text-zinc-600 select-none">
            <span className="font-serif italic text-lg select-none">✕</span>
            <div className="h-px flex-1 border-b border-dashed border-zinc-200 dark:border-zinc-700/80" />
          </div>

          {/* Empty placeholder guide */}
          {!hasStrokes && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-zinc-400 dark:text-zinc-500 select-none">
              <PenLine className="size-6 stroke-[1.5] text-amber-600/70 dark:text-amber-500/70" />
              <p className="text-xs uppercase tracking-wider font-medium text-zinc-500 dark:text-zinc-400">
                Sign with Apple Pencil, Stylus, or Finger
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Touchscreen optimized for iPad & mobile
              </p>
            </div>
          )}

          {/* HTML5 Canvas with pointer events and touch-action: none */}
          <canvas
            ref={canvasRef}
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrawing}
            onPointerCancel={endDrawing}
            style={{
              touchAction: "none",
              display: "block",
              width: "100%",
              height: `${height}px`,
            }}
            className={cn(
              "touch-none select-none cursor-crosshair relative z-10",
              disabled && "pointer-events-none"
            )}
            aria-label="Touchscreen Digital Signature Canvas"
          />
        </div>

        {/* Toolbar: status & clear button */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs">
            {hasStrokes ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Signature Captured
              </span>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500">
                Awaiting client signature
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={disabled || !hasStrokes}
            className="h-8 gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <RotateCcw className="size-3.5" />
            Clear Signature
          </Button>
        </div>
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";
