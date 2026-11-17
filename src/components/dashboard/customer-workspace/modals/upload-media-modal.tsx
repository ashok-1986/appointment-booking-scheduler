"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Camera, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_META, type MediaCategory } from "@/lib/gallery-types";

export function UploadMediaModal({
  isOpen,
  onClose,
  customerId,
  bookingId,
  customerName,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  bookingId: string | null;
  customerName: string;
  onSuccess: () => Promise<void>;
}) {
  const [category, setCategory] = useState<MediaCategory>("fresh");
  const [caption, setCaption] = useState("");
  const [consentForMarketing, setConsentForMarketing] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("Please choose at least one photograph to upload");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("clientId", customerId);
      if (bookingId) formData.append("bookingId", bookingId);
      formData.append("category", category);
      formData.append("caption", caption);
      formData.append("consentForMarketing", String(consentForMarketing));

      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append("files", selectedFiles[i]);
      }

      const res = await fetch("/api/gallery", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to upload photographs");
      }

      toast.success(`${selectedFiles.length} photo(s) uploaded & archived to client profile`);
      await onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md font-body">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <Camera className="size-5 text-[#C4FF61]" />
            Upload Tattoo Media for {customerName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-medium text-foreground mb-1">
              Select Photos
            </label>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(e) => setSelectedFiles(e.target.files)}
              className="text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">
              Photo Category
            </label>
            <Select value={category} onValueChange={(val: any) => setCategory(val)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fresh">Fresh Studio Photograph (Post-session)</SelectItem>
                <SelectItem value="healed">Healed Result (4-8 weeks follow-up)</SelectItem>
                <SelectItem value="reference">Client Reference / Inspiration Moodboard</SelectItem>
                <SelectItem value="design">Custom Stencil / Digital Concept</SelectItem>
                <SelectItem value="before">Before Session Canvas</SelectItem>
                <SelectItem value="touch_up">Touch-up Refinement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">
              Caption / Placement Notes (Optional)
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Inner forearm shading pass with silverwash..."
              className="min-h-[60px] text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5">
            <div>
              <span className="font-medium text-foreground block">Client Portfolio Consent</span>
              <span className="text-[11px] text-muted-foreground">Approved for social media & studio portfolio showcase</span>
            </div>
            <Switch
              checked={consentForMarketing}
              onCheckedChange={setConsentForMarketing}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isUploading}
              className="bg-[#C4FF61] text-[#1A1A1A] hover:bg-[#b2f048] font-semibold"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Uploading...
                </>
              ) : (
                "Upload & Save to Gallery"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
