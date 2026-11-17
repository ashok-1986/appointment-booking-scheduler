"use client";

import { useMemo } from "react";
import { Check, AlertCircle, Ban } from "lucide-react";
import {
  V1_PIPELINE_STAGES,
  V1_STAGE_LABELS,
  V1_STAGE_DESCRIPTIONS,
  normalizeToV1Stage,
  type V1BookingStage,
} from "@/lib/state-machine";

export function PipelineProgressionBar({
  currentStageRaw,
}: {
  currentStageRaw: string;
}) {
  const currentStage: V1BookingStage = useMemo(() => {
    return normalizeToV1Stage(currentStageRaw);
  }, [currentStageRaw]);

  const isTerminalRejection = currentStage === "not_a_fit" || currentStage === "cancelled";
  const currentIndex = V1_PIPELINE_STAGES.indexOf(currentStage as any);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs font-body">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Tattoo Progression Pipeline
        </h3>
        {isTerminalRejection ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
            <Ban className="size-3" />
            {currentStage === "not_a_fit" ? "Not a Fit" : "Cancelled"}
          </span>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            Stage {currentIndex >= 0 ? currentIndex + 1 : 1} of 7:{" "}
            <strong className="text-foreground">
              {V1_STAGE_LABELS[currentStage as keyof typeof V1_STAGE_LABELS] || currentStage}
            </strong>
          </span>
        )}
      </div>

      {/* 7-Step Progress Pipeline */}
      <div className="relative">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {V1_PIPELINE_STAGES.map((stageKey, idx) => {
            const isCompleted = currentIndex > idx && !isTerminalRejection;
            const isCurrent = currentIndex === idx && !isTerminalRejection;
            const isPending = currentIndex < idx && !isTerminalRejection;

            return (
              <div
                key={stageKey}
                className="group relative flex flex-col items-center text-center"
                title={`${V1_STAGE_LABELS[stageKey]}: ${V1_STAGE_DESCRIPTIONS[stageKey]}`}
              >
                {/* Step Circle */}
                <div
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-all sm:size-8 ${
                    isCompleted
                      ? "bg-emerald-500 text-white shadow-xs"
                      : isCurrent
                      ? "border-2 border-[#C4FF61] bg-foreground text-background shadow-xs ring-2 ring-[#C4FF61]/30"
                      : "border border-border bg-muted/40 text-muted-foreground opacity-60"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="size-3.5 sm:size-4 stroke-[3]" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Label (shortened on small viewports) */}
                <span
                  className={`mt-1.5 hidden text-[11px] leading-tight transition-colors sm:block line-clamp-2 ${
                    isCurrent
                      ? "font-bold text-foreground"
                      : isCompleted
                      ? "font-medium text-foreground/80"
                      : "text-muted-foreground opacity-60"
                  }`}
                >
                  {V1_STAGE_LABELS[stageKey]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
