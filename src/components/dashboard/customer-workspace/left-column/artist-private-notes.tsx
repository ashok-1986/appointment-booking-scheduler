"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

export function ArtistPrivateNotes({
  customerId,
  initialNotes,
}: {
  customerId: string;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save consultation notes");
      }
      setIsDirty(false);
      toast.success("Private consultation notes saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs font-body" id="artist-private-notes-section">
      <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5">
          <Lock className="size-3 text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Artist Private Notes
          </h3>
        </div>
        {isDirty && (
          <span className="text-[10px] font-medium text-amber-500">Unsaved changes</span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mb-2">
        Confidential studio notes on skin sensitivities, sizing preferences, and design discussions.
      </p>

      <Textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setIsDirty(true);
        }}
        placeholder="Record confidential client notes here..."
        className="min-h-[120px] text-xs resize-none bg-background/50 focus-visible:ring-1 focus-visible:ring-[#C4FF61]"
      />

      <div className="mt-2.5 flex justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="h-7 text-xs bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-1.5 size-3 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-1.5 size-3" /> Save Notes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
