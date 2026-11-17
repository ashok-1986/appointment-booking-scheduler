"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Camera, Plus, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, type MediaCategory } from "@/lib/gallery-types";

export function EmbeddedMediaGallery({
  mediaAssets,
  onOpenUploadModal,
  onImageClick,
}: {
  mediaAssets: any[];
  onOpenUploadModal: () => void;
  onImageClick: (url: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = Object.keys(CATEGORY_META) as MediaCategory[];

  const filteredAssets = useMemo(() => {
    if (selectedCategory === "all") return mediaAssets;
    return mediaAssets.filter((a) => a.category === selectedCategory);
  }, [mediaAssets, selectedCategory]);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs font-body">
      <div className="mb-2.5 flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5">
          <Camera className="size-3.5 text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tattoo Gallery ({mediaAssets.length})
          </h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenUploadModal}
          className="h-6 text-[11px] px-2 text-foreground border-border/80 hover:border-[#C4FF61] hover:bg-[#C4FF61]/10"
        >
          <Plus className="mr-1 size-3 text-[#C4FF61]" /> Upload
        </Button>
      </div>

      {/* Category Pills */}
      <div className="mb-3 flex flex-wrap gap-1 overflow-x-auto pb-1 text-xs scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
            selectedCategory === "all"
              ? "bg-foreground text-background font-semibold"
              : "border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({mediaAssets.length})
        </button>
        {categories.map((cat) => {
          const count = mediaAssets.filter((a) => a.category === cat).length;
          if (count === 0 && selectedCategory !== cat) return null;
          const meta = CATEGORY_META[cat];
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-foreground text-background font-semibold"
                  : "border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {meta.label.split(" ")[0]} ({count})
            </button>
          );
        })}
      </div>

      {/* Thumbnails Grid */}
      {filteredAssets.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          <ImageIcon className="mx-auto mb-1.5 size-6 text-muted-foreground/40" />
          <p className="font-medium">No photos in this category.</p>
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="mt-1 text-[11px] font-semibold text-[#C4FF61] hover:underline"
          >
            + Upload Fresh Tattoo Photos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {filteredAssets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => onImageClick(asset.url)}
              className="group relative aspect-square overflow-hidden rounded-md border border-border/60 bg-muted/30 hover:border-[#C4FF61] transition-colors"
            >
              <Image
                src={asset.url}
                alt={asset.caption || "Tattoo media"}
                fill
                className="object-cover group-hover:scale-105 transition-transform"
              />
              {asset.category && (
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] text-white">
                  {asset.category}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
