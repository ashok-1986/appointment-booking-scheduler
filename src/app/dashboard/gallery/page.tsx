"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Upload,
  Image as ImageIcon,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Trash2,
  Maximize2,
  Share2,
  Eye,
  Calendar,
  User,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Camera,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CATEGORY_META, type MediaCategory, type MediaAssetWithDetails } from "@/lib/gallery-types";
import { toast } from "sonner";

type ClientItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagramHandle: string | null;
};

type SessionItem = {
  id: string;
  sessionNumber: number;
  scheduledStart: string;
  durationMinutes: number;
  status: string;
  placement: string | null;
};

const CATEGORIES: Array<{ key: "all" | MediaCategory; label: string }> = [
  { key: "all", label: "All Photos" },
  { key: "fresh", label: "Fresh Tattoos" },
  { key: "healed", label: "Healed (Follow-ups)" },
  { key: "reference", label: "Reference Images" },
  { key: "design", label: "Design Concepts" },
  { key: "before", label: "Before Session" },
  { key: "touch_up", label: "Touch-ups" },
];

export default function GalleryPage() {
  const [assets, setAssets] = useState<MediaAssetWithDetails[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<"all" | MediaCategory>("all");
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [uploadClientId, setUploadClientId] = useState<string>("");
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>("fresh");
  const [uploadSessionId, setUploadSessionId] = useState<string>("");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadConsent, setUploadConsent] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [clientSessions, setClientSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Load gallery assets and clients
  const fetchGalleryData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/gallery");
      const data = await res.json();
      if (data.ok) {
        setAssets(data.assets || []);
        setClients(data.clients || []);
      } else {
        toast.error(data.error || "Failed to load studio gallery");
      }
    } catch (err) {
      console.error("Gallery fetch failed:", err);
      toast.error("Failed to connect to gallery service");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGalleryData();
  }, [fetchGalleryData]);

  // Load client sessions when client is picked in upload modal
  useEffect(() => {
    if (!uploadClientId) {
      setClientSessions([]);
      setUploadSessionId("");
      return;
    }
    async function loadSessions() {
      try {
        setLoadingSessions(true);
        const res = await fetch(`/api/gallery?meta=client_sessions&clientId=${uploadClientId}`);
        const data = await res.json();
        if (data.ok) {
          setClientSessions(data.sessions || []);
        }
      } catch (err) {
        console.error("Error loading client sessions:", err);
      } finally {
        setLoadingSessions(false);
      }
    }
    loadSessions();
  }, [uploadClientId]);

  // Filtered assets based on category tab, client dropdown, and search query
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (selectedCategory !== "all" && asset.category !== selectedCategory) {
        return false;
      }
      if (selectedClientId !== "all" && asset.clientId !== selectedClientId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCaption = asset.caption?.toLowerCase().includes(q);
        const matchesClient = asset.client?.name.toLowerCase().includes(q);
        const matchesPlacement = asset.booking?.placement?.toLowerCase().includes(q);
        const matchesCategory = CATEGORY_META[asset.category]?.label.toLowerCase().includes(q);
        if (!matchesCaption && !matchesClient && !matchesPlacement && !matchesCategory) {
          return false;
        }
      }
      return true;
    });
  }, [assets, selectedCategory, selectedClientId, searchQuery]);

  // Handle files selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    addFilesToUpload(selected);
  };

  const addFilesToUpload = (files: File[]) => {
    const validFiles = files.filter((file) => {
      const isValidType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValidType) toast.error(`${file.name}: Only JPEG, PNG, and WebP are allowed`);
      if (!isValidSize) toast.error(`${file.name}: Exceeds 10MB limit`);
      return isValidType && isValidSize;
    });

    if (validFiles.length === 0) return;

    setUploadFiles((prev) => [...prev, ...validFiles]);
    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
    setUploadPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeUploadFile = (index: number) => {
    URL.revokeObjectURL(uploadPreviews[index]);
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const resetUploadForm = () => {
    uploadPreviews.forEach((url) => URL.revokeObjectURL(url));
    setUploadFiles([]);
    setUploadPreviews([]);
    setUploadClientId("");
    setUploadSessionId("");
    setUploadCaption("");
    setUploadCategory("fresh");
    setUploadConsent(true);
    setUploadModalOpen(false);
  };

  // Submit upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadClientId) {
      toast.error("Please select a client for this photograph");
      return;
    }
    if (uploadFiles.length === 0) {
      toast.error("Please select at least one photograph to upload");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("clientId", uploadClientId);
      formData.append("category", uploadCategory);
      formData.append("caption", uploadCaption);
      formData.append("consentForMarketing", String(uploadConsent));
      if (uploadSessionId) {
        formData.append("sessionId", uploadSessionId);
      }

      uploadFiles.forEach((file) => {
        formData.append("file", file);
      });

      const res = await fetch("/api/gallery", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(`Successfully uploaded ${uploadFiles.length} photograph(s)`);
        resetUploadForm();
        fetchGalleryData();
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("An error occurred during photograph upload");
    } finally {
      setIsUploading(false);
    }
  };

  // Toggle marketing consent
  const handleToggleConsent = async (assetId: string, currentStatus: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const nextStatus = !currentStatus;
      // Optimistic update
      setAssets((prev) =>
        prev.map((a) => (a.id === assetId ? { ...a, consentForMarketing: nextStatus } : a))
      );

      const res = await fetch("/api/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assetId, consentForMarketing: nextStatus }),
      });

      if (!res.ok) {
        // Rollback
        setAssets((prev) =>
          prev.map((a) => (a.id === assetId ? { ...a, consentForMarketing: currentStatus } : a))
        );
        toast.error("Failed to update marketing consent");
      } else {
        toast.success(
          nextStatus ? "Marked as approved for portfolio & social" : "Restricted from public portfolio"
        );
      }
    } catch (err) {
      console.error("Consent update error:", err);
      toast.error("Network error updating consent");
    }
  };

  // Delete asset
  const handleDeleteAsset = async (assetId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this photograph from studio media?")) return;

    try {
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      if (lightboxIndex !== null) setLightboxIndex(null);

      const res = await fetch(`/api/gallery?id=${assetId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Photograph removed from studio library");
      } else {
        fetchGalleryData();
        toast.error("Failed to delete photograph");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete photograph");
      fetchGalleryData();
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev > 0 ? prev - 1 : filteredAssets.length - 1) : null
        );
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev < filteredAssets.length - 1 ? prev + 1 : 0) : null
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, filteredAssets.length]);

  const activeLightboxAsset = lightboxIndex !== null ? filteredAssets[lightboxIndex] : null;

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-semibold px-2.5 py-0.5 rounded-full bg-[#C4FF61] text-[#1A1A1A]">
              Studio Media Library
            </span>
            <span className="text-xs text-muted-foreground font-mono">CD-03</span>
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-serif font-light tracking-tight text-foreground">
            Tattoo Photo Gallery
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl font-light">
            Manage fresh ink photographs, healed client follow-ups, reference moodboards, and stencil designs with verified social portfolio consent.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="bg-[#C4FF61] hover:bg-[#b2f04b] text-[#1A1A1A] font-medium shadow-sm transition-all hover:shadow-md gap-2"
          >
            <Camera className="h-4 w-4" />
            <span>Upload Photographs</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          {CATEGORIES.map((tab) => {
            const isActive = selectedCategory === tab.key;
            const count =
              tab.key === "all"
                ? assets.length
                : assets.filter((a) => a.category === tab.key).length;

            return (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#1A1A1A] text-white shadow dark:bg-[#FDFFE9] dark:text-[#1A1A1A]"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                    isActive
                      ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                      : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Client Selector & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Client Filter Dropdown */}
          <div className="w-full sm:w-56">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Filter by Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients ({clients.length})</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search caption or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Photo Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse border border-zinc-200 dark:border-zinc-800"
            />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="rounded-full bg-[#C4FF61]/20 p-4 text-[#1A1A1A] dark:text-[#C4FF61]">
            <ImageIcon className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-serif font-medium text-foreground">
            No studio photographs found
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm font-light">
            {searchQuery || selectedCategory !== "all" || selectedClientId !== "all"
              ? "No photos match the selected filters. Try clearing your filters or search terms."
              : "Start organizing your tattoo photography by uploading your first session or healed photos."}
          </p>
          <div className="mt-6 flex gap-3">
            {(searchQuery || selectedCategory !== "all" || selectedClientId !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedClientId("all");
                  setSearchQuery("");
                }}
              >
                Clear Filters
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setUploadModalOpen(true)}
              className="bg-[#C4FF61] text-[#1A1A1A] hover:bg-[#b2f04b]"
            >
              Upload Photographs
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAssets.map((asset, index) => {
            const meta = CATEGORY_META[asset.category] || CATEGORY_META.fresh;
            const uploadDate = new Date(asset.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={asset.id}
                onClick={() => setLightboxIndex(index)}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer"
              >
                {/* Image Container with Aspect Ratio */}
                <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <Image
                    src={asset.url}
                    alt={asset.caption || `${meta.label} for ${asset.client?.name || "client"}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority={index < 4}
                  />

                  {/* Top Badges */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-1 pointer-events-none">
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs ${meta.badgeBg} ${meta.badgeText} border ${meta.borderColor}`}
                    >
                      {meta.label}
                    </span>

                    {asset.consentForMarketing ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/90 text-white shadow-xs backdrop-blur-md">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Portfolio OK</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900/70 text-zinc-300 backdrop-blur-md">
                        Private
                      </span>
                    )}
                  </div>

                  {/* Hover Actions Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center gap-2">
                    <button
                      title="Enlarge photograph"
                      className="rounded-full bg-white/90 p-2 text-zinc-900 shadow-md hover:bg-white hover:scale-110 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(index);
                      }}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    <button
                      title={asset.consentForMarketing ? "Revoke marketing consent" : "Approve for social/portfolio"}
                      className={`rounded-full p-2 shadow-md hover:scale-110 transition-all ${
                        asset.consentForMarketing
                          ? "bg-[#C4FF61] text-[#1A1A1A]"
                          : "bg-white/90 text-zinc-800 hover:bg-white"
                      }`}
                      onClick={(e) => handleToggleConsent(asset.id, asset.consentForMarketing, e)}
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      title="Delete photograph"
                      className="rounded-full bg-red-500/90 p-2 text-white shadow-md hover:bg-red-600 hover:scale-110 transition-all"
                      onClick={(e) => handleDeleteAsset(asset.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Card Info Footer */}
                <div className="p-3.5 flex flex-col justify-between flex-1 gap-2 bg-card">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1 truncate">
                        <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{asset.client?.name || "Unknown Client"}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {uploadDate}
                      </span>
                    </div>

                    {asset.caption && (
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 font-light">
                        {asset.caption}
                      </p>
                    )}
                  </div>

                  {asset.booking?.placement && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate">Placement: {asset.booking.placement}</span>
                      {asset.session && (
                        <span className="text-[10px] font-mono text-zinc-500">
                          S#{asset.session.sessionNumber}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Photographs Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={(open) => !isUploading && setUploadModalOpen(open)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-light text-foreground flex items-center gap-2">
              <Camera className="h-6 w-6 text-[#1A1A1A] dark:text-[#C4FF61]" />
              <span>Upload Photographs to Media Library</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-5 pt-2">
            {/* File Dropzone */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Select Images (JPEG, PNG, WebP — max 10MB each)</Label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[#C4FF61] dark:hover:border-[#C4FF61] rounded-2xl p-6 cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/40 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-xs font-medium text-foreground">
                  Click to browse or drop images here
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 font-light">
                  Upload multiple photos at once
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Selected File Previews */}
            {uploadPreviews.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Selected Photographs ({uploadPreviews.length})
                </Label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 border rounded-xl">
                  {uploadPreviews.map((preview, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                      <Image
                        src={preview}
                        alt={`Preview ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeUploadFile(idx)}
                        className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white hover:bg-black transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Client and Category Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Client <span className="text-red-500">*</span>
                </Label>
                <Select value={uploadClientId} onValueChange={setUploadClientId}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={uploadCategory}
                  onValueChange={(val) => setUploadCategory(val as MediaCategory)}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fresh">Fresh Tattoos (Post-session)</SelectItem>
                    <SelectItem value="healed">Healed (Follow-ups)</SelectItem>
                    <SelectItem value="reference">Reference Images</SelectItem>
                    <SelectItem value="design">Design Concepts</SelectItem>
                    <SelectItem value="before">Before Session</SelectItem>
                    <SelectItem value="touch_up">Touch-ups</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Optional Session Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Associated Booking Session (Optional)
              </Label>
              <Select
                value={uploadSessionId}
                onValueChange={setUploadSessionId}
                disabled={!uploadClientId || loadingSessions}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue
                    placeholder={
                      !uploadClientId
                        ? "Select client first"
                        : loadingSessions
                        ? "Loading client sessions..."
                        : clientSessions.length === 0
                        ? "No scheduled sessions found for this client"
                        : "Link to appointment session"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None / General Studio Photo</SelectItem>
                  {clientSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      Session #{s.sessionNumber} ({new Date(s.scheduledStart).toLocaleDateString("en-IN")}
                      {s.placement ? ` - ${s.placement}` : ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional Caption */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Caption & Studio Notes (Optional)</Label>
              <Textarea
                placeholder="e.g. Fine line peony on inner forearm. 3RL needle, Dynamic Black ink."
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {/* Marketing Consent Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="marketing-consent" className="text-xs font-medium cursor-pointer">
                  Marketing & Portfolio Consent
                </Label>
                <p className="text-[11px] text-muted-foreground font-light leading-snug">
                  Client has approved this photograph for Meet Prerna social media, website gallery, and promotional portfolio.
                </p>
              </div>
              <Switch
                id="marketing-consent"
                checked={uploadConsent}
                onCheckedChange={setUploadConsent}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetUploadForm}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUploading || uploadFiles.length === 0 || !uploadClientId}
                className="bg-[#C4FF61] text-[#1A1A1A] hover:bg-[#b2f04b] font-medium gap-2 min-w-[120px]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload {uploadFiles.length > 0 ? `(${uploadFiles.length})` : ""}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full-Screen Lightbox Modal */}
      {activeLightboxAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Close Button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 transition-colors"
            title="Close (Esc)"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation Prev Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((prev) =>
                prev !== null ? (prev > 0 ? prev - 1 : filteredAssets.length - 1) : null
              );
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors hidden sm:block"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Navigation Next Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((prev) =>
                prev !== null ? (prev < filteredAssets.length - 1 ? prev + 1 : 0) : null
              );
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors hidden sm:block"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Main Lightbox Content Area */}
          <div className="relative flex flex-col lg:flex-row w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl bg-[#1A1A1A] text-white border border-zinc-800 shadow-2xl">
            {/* Main Image Display */}
            <div className="relative flex-1 min-h-[360px] lg:min-h-[560px] max-h-[65vh] lg:max-h-[85vh] bg-black/60 flex items-center justify-center p-4">
              <div className="relative w-full h-full">
                <Image
                  src={activeLightboxAsset.url}
                  alt={activeLightboxAsset.caption || "Tattoo photography preview"}
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              {/* Counter Pill */}
              <div className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1 text-xs font-mono text-zinc-300 backdrop-blur-md">
                {(lightboxIndex ?? 0) + 1} / {filteredAssets.length}
              </div>
            </div>

            {/* Sidebar Metadata & Controls */}
            <div className="w-full lg:w-80 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-zinc-800 bg-[#161616]">
              <div className="space-y-4">
                {/* Category Badge & Date */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_META[activeLightboxAsset.category].badgeBg} ${CATEGORY_META[activeLightboxAsset.category].badgeText} border ${CATEGORY_META[activeLightboxAsset.category].borderColor}`}
                  >
                    {CATEGORY_META[activeLightboxAsset.category].label}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {new Date(activeLightboxAsset.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {/* Client Info */}
                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                    Client Details
                  </p>
                  <p className="text-base font-serif font-medium text-white mt-1">
                    {activeLightboxAsset.client?.name || "Unknown Client"}
                  </p>
                  {activeLightboxAsset.client?.phone && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {activeLightboxAsset.client.phone}
                    </p>
                  )}
                  {activeLightboxAsset.client?.instagramHandle && (
                    <p className="text-xs text-[#C4FF61] mt-0.5">
                      @{activeLightboxAsset.client.instagramHandle.replace("@", "")}
                    </p>
                  )}
                </div>

                {/* Booking & Placement Info */}
                {activeLightboxAsset.booking && (
                  <div className="border-t border-zinc-800 pt-3 text-xs space-y-1">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                      Piece Information
                    </p>
                    {activeLightboxAsset.booking.placement && (
                      <p className="text-zinc-300">
                        <span className="text-zinc-500">Placement:</span>{" "}
                        {activeLightboxAsset.booking.placement}
                      </p>
                    )}
                    {activeLightboxAsset.booking.serviceType && (
                      <p className="text-zinc-300">
                        <span className="text-zinc-500">Service:</span>{" "}
                        {activeLightboxAsset.booking.serviceType}
                      </p>
                    )}
                    {activeLightboxAsset.session && (
                      <p className="text-zinc-300 font-mono text-[11px]">
                        Session #{activeLightboxAsset.session.sessionNumber} (
                        {new Date(activeLightboxAsset.session.scheduledStart).toLocaleDateString("en-IN")})
                      </p>
                    )}
                  </div>
                )}

                {/* Caption */}
                {activeLightboxAsset.caption && (
                  <div className="border-t border-zinc-800 pt-3">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                      Notes & Caption
                    </p>
                    <p className="text-xs text-zinc-300 mt-1 font-light leading-relaxed">
                      {activeLightboxAsset.caption}
                    </p>
                  </div>
                )}

                {/* Marketing Consent Toggle */}
                <div className="border-t border-zinc-800 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-white">Portfolio Consent</p>
                      <p className="text-[11px] text-zinc-400">
                        {activeLightboxAsset.consentForMarketing
                          ? "Approved for social portfolio"
                          : "Restricted from public display"}
                      </p>
                    </div>
                    <Switch
                      checked={activeLightboxAsset.consentForMarketing}
                      onCheckedChange={(checked) =>
                        handleToggleConsent(activeLightboxAsset.id, !checked)
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="border-t border-zinc-800 pt-4 flex items-center justify-between gap-2 mt-4">
                <a
                  href={activeLightboxAsset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Full Resolution</span>
                </a>
                <button
                  onClick={() => handleDeleteAsset(activeLightboxAsset.id)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
