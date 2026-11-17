"use client";

import { Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NoActiveProjectCard({
  customerName,
  onCreateNewProject,
}: {
  customerName: string;
  onCreateNewProject?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center shadow-xs font-body bg-card/60">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <Sparkles className="size-6 text-[#C4FF61]" />
      </div>
      <h3 className="font-heading text-lg font-bold text-foreground">
        No Active Tattoo Projects
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        {customerName} does not have an active tattoo booking currently in progress.
      </p>

      {onCreateNewProject && (
        <div className="mt-4">
          <Button
            size="sm"
            onClick={onCreateNewProject}
            className="bg-[#C4FF61] text-[#1A1A1A] hover:bg-[#b2f048] font-semibold text-xs h-8 px-4"
          >
            <Plus className="mr-1.5 size-3.5" /> Start New Tattoo Project
          </Button>
        </div>
      )}
    </div>
  );
}
